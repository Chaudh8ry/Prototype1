const express = require('express');
const HealthProfile = require('../models/HealthProfile');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const buildBMI = (bodyMetrics = {}) => {
  if (!bodyMetrics?.height || !bodyMetrics?.weight) return null;

  const { height, weight, unit } = bodyMetrics;
  let heightInM;
  let weightInKg;

  if (unit === 'metric') {
    heightInM = parseFloat(height) / 100;
    weightInKg = parseFloat(weight);
  } else {
    heightInM = parseFloat(height) * 0.3048;
    weightInKg = parseFloat(weight) * 0.453592;
  }

  const bmi = weightInKg / (heightInM * heightInM);
  return Number.isFinite(bmi) ? parseFloat(bmi.toFixed(1)) : null;
};

const getProfilesPayload = async (userId) => {
  const user = await User.findById(userId).select('active_profile health_profile first_name');
  const rawProfiles = await HealthProfile.find({ user: userId }).sort({
    is_primary: -1,
    createdAt: 1,
  });
  const profiles = rawProfiles.map((profile) => {
    const normalized = profile.toObject();
    if (!normalized.profile_name) {
      normalized.profile_name = normalized.is_primary
        ? `${user?.first_name || 'My'} Profile`
        : 'Family member';
    }
    if (!normalized.relationship) {
      normalized.relationship = normalized.is_primary ? 'Self' : 'Family member';
    }
    return normalized;
  });

  return {
    profiles,
    active_profile_id: user?.active_profile || user?.health_profile || profiles[0]?._id || null,
  };
};

const getActingProfile = async (userId) => {
  const user = await User.findById(userId).select('active_profile health_profile');
  const actingProfileId = user?.active_profile || user?.health_profile || null;
  if (!actingProfileId) return null;

  return HealthProfile.findOne({
    _id: actingProfileId,
    user: userId,
  });
};

router.post('/', auth, async (req, res) => {
  try {
    const {
      profile_id,
      profile_name,
      relationship,
      age_group,
      allergies,
      custom_allergy,
      health_conditions,
      dietary_preferences,
      additional_info,
      body_metrics,
      activity_level,
      set_active = true,
    } = req.body;

    if (!profile_name?.trim()) {
      return res.status(400).json({ message: 'Profile name is required' });
    }

    if (!age_group) {
      return res.status(400).json({ message: 'Age group is required' });
    }

    if (!activity_level) {
      return res.status(400).json({ message: 'Activity level is required' });
    }

    const existingProfiles = await HealthProfile.find({ user: req.user._id });
    const actingProfile = await getActingProfile(req.user._id);
    const bmi = buildBMI(body_metrics);

    const profileData = {
      user: req.user._id,
      profile_name: profile_name.trim(),
      relationship: relationship?.trim() || 'Family member',
      age_group,
      allergies: allergies || [],
      custom_allergy: custom_allergy || '',
      health_conditions: health_conditions || [],
      dietary_preferences: dietary_preferences || [],
      additional_info: additional_info || '',
      activity_level,
      body_metrics: {
        ...body_metrics,
        bmi,
      },
    };

    let profile;

    if (profile_id) {
      if (actingProfile && !actingProfile.is_primary && String(actingProfile._id) !== String(profile_id)) {
        return res.status(403).json({ message: 'Only the main profile can edit other family members.' });
      }

      profile = await HealthProfile.findOneAndUpdate(
        { _id: profile_id, user: req.user._id },
        profileData,
        { new: true },
      );

      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
    } else {
      if (existingProfiles.length > 0 && actingProfile && !actingProfile.is_primary) {
        return res.status(403).json({ message: 'Switch back to your main profile to add family members.' });
      }

      profile = new HealthProfile({
        ...profileData,
        is_primary: existingProfiles.length === 0,
      });
      await profile.save();
    }

    const updatePayload = {};

    if (existingProfiles.length === 0 || profile.is_primary) {
      updatePayload.health_profile = profile._id;
    }

    if (set_active !== false || existingProfiles.length === 0) {
      updatePayload.active_profile = profile._id;
    }

    if (Object.keys(updatePayload).length) {
      await User.findByIdAndUpdate(req.user._id, updatePayload);
    }

    const payload = await getProfilesPayload(req.user._id);

    res.json({
      message: 'Profile saved successfully',
      profile,
      ...payload,
    });
  } catch (error) {
    console.error('Profile save error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const payload = await getProfilesPayload(req.user._id);
    const activeProfile =
      payload.profiles.find(
        (profile) => String(profile._id) === String(payload.active_profile_id),
      ) || payload.profiles[0] || null;

    res.json({
      profile: activeProfile,
      can_manage_family: Boolean(activeProfile?.is_primary),
      ...payload,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/active/:id', auth, async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      active_profile: profile._id,
    });

    const payload = await getProfilesPayload(req.user._id);

    res.json({
      message: 'Active profile updated',
      active_profile_id: payload.active_profile_id,
      profiles: payload.profiles,
    });
  } catch (error) {
    console.error('Set active profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const actingProfile = await getActingProfile(req.user._id);
    if (!actingProfile?.is_primary) {
      return res.status(403).json({ message: 'Only the main profile can delete family members.' });
    }

    const profile = await HealthProfile.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (profile.is_primary) {
      return res.status(400).json({ message: 'Your main profile cannot be deleted.' });
    }

    const allProfiles = await HealthProfile.find({ user: req.user._id }).sort({
      is_primary: -1,
      createdAt: 1,
    });

    if (allProfiles.length <= 1) {
      return res.status(400).json({ message: 'You must keep at least one profile.' });
    }

    await HealthProfile.deleteOne({ _id: profile._id });

    const remainingProfiles = await HealthProfile.find({ user: req.user._id }).sort({
      is_primary: -1,
      createdAt: 1,
    });

    let nextPrimary = remainingProfiles.find((item) => item.is_primary) || remainingProfiles[0];

    if (!nextPrimary.is_primary) {
      nextPrimary.is_primary = true;
      await nextPrimary.save();
    }

    const user = await User.findById(req.user._id).select('active_profile health_profile');
    const updatePayload = {};

    if (String(user?.active_profile) === String(profile._id)) {
      updatePayload.active_profile = nextPrimary._id;
    }

    if (String(user?.health_profile) === String(profile._id)) {
      updatePayload.health_profile = nextPrimary._id;
    }

    if (Object.keys(updatePayload).length) {
      await User.findByIdAndUpdate(req.user._id, updatePayload);
    }

    const payload = await getProfilesPayload(req.user._id);

    res.json({
      message: 'Profile deleted successfully',
      ...payload,
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
