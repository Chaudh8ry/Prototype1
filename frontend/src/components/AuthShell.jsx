import React from 'react';
import { Leaf, ShieldCheck } from 'lucide-react';

const AuthShell = ({
  title,
  accentTitle,
  subtitle,
  secondaryText,
  secondaryActionLabel,
  secondaryAction,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#f6f3ee]">
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid min-h-[calc(100vh-2.5rem)] overflow-hidden rounded-[36px] bg-white shadow-[0_30px_80px_rgba(56,78,61,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,#43b36b_0%,#1f7a76_42%,#145d63_100%)] px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.48)_0%,rgba(255,255,255,0.14)_32%,transparent_64%)]" />
            <div className="relative z-10 flex h-full flex-col">
              <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[30px] bg-white/92 shadow-[0_20px_45px_rgba(14,49,42,0.18)]">
                <Leaf className="h-9 w-9 text-[#18df13]" />
              </div>

              <div className="flex-1">
                <div className="relative mx-auto mt-4 max-w-xl">
                  <div className="absolute inset-x-8 bottom-0 h-36 rounded-full bg-white/25 blur-3xl" />
                  <div className="relative h-[360px] overflow-hidden rounded-[34px] bg-[radial-gradient(circle_at_top,#4cc38c_0%,#1d8c81_38%,#165f67_100%)] shadow-[0_28px_60px_rgba(10,34,29,0.30)] sm:h-[430px]">
                    <div className="absolute left-[-12%] top-[12%] h-44 w-44 rounded-full bg-[#7ef45c]/18 blur-3xl" />
                    <div className="absolute right-[-8%] top-[8%] h-40 w-40 rounded-full bg-white/14 blur-3xl" />
                    <div className="absolute bottom-[-6%] left-[8%] h-40 w-72 rounded-full bg-white/18 blur-3xl" />

                    <div className="absolute left-[10%] top-[24%] flex h-40 w-24 rotate-[-6deg] items-end justify-center rounded-[26px] bg-[linear-gradient(180deg,#d8f48f_0%,#67a93a_78%)] shadow-[0_24px_34px_rgba(18,59,32,0.28)]">
                      <div className="mb-4 h-20 w-16 rounded-[18px] bg-[linear-gradient(180deg,#f9fff1_0%,#ecf8db_100%)]" />
                    </div>

                    <div className="absolute left-[31%] top-[16%] flex h-44 w-28 rotate-[8deg] items-center justify-center rounded-[30px] bg-[linear-gradient(180deg,#fff6d8_0%,#efca62_100%)] shadow-[0_24px_34px_rgba(64,49,15,0.26)]">
                      <div className="h-20 w-16 rounded-[18px] border-4 border-white/70" />
                    </div>

                    <div className="absolute right-[12%] top-[30%] flex h-48 w-36 rotate-[10deg] items-center justify-center rounded-[34px] bg-[linear-gradient(180deg,#f6fffb_0%,#c8efe2_100%)] shadow-[0_26px_40px_rgba(16,49,42,0.28)]">
                      <div className="h-24 w-20 rounded-[22px] bg-[linear-gradient(180deg,#1f7a76_0%,#38b177_100%)] shadow-inner" />
                    </div>

                    <div className="absolute left-[22%] top-[58%] h-16 w-16 rounded-full bg-[radial-gradient(circle_at_top,#ff7f68_0%,#f04f37_100%)] shadow-[0_12px_24px_rgba(56,18,15,0.25)]" />
                    <div className="absolute left-[35%] top-[63%] h-12 w-12 rounded-full bg-[radial-gradient(circle_at_top,#ff8e6e_0%,#eb5f41_100%)] shadow-[0_12px_24px_rgba(56,18,15,0.22)]" />
                    <div className="absolute left-[46%] top-[66%] h-10 w-10 rounded-full bg-[radial-gradient(circle_at_top,#9ce15d_0%,#4c8f44_100%)] shadow-[0_10px_20px_rgba(25,62,30,0.22)]" />

                    <div className="absolute right-[18%] top-[62%] h-14 w-28 rotate-[-28deg] rounded-[40px] bg-[linear-gradient(135deg,#9ee664_0%,#3f8d48_100%)] shadow-[0_12px_24px_rgba(25,62,30,0.25)]" />

                    <div className="absolute bottom-[12%] left-[16%] flex h-28 w-44 rotate-[-8deg] items-center gap-3 rounded-[28px] border border-white/35 bg-white/14 px-4 backdrop-blur-md shadow-[0_18px_38px_rgba(10,34,29,0.16)]">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#18ef0f] text-[#10151d] shadow-[0_12px_24px_rgba(35,221,24,0.22)]">
                        <Leaf className="h-7 w-7" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 h-2.5 w-20 rounded-full bg-white/75" />
                        <div className="mb-2 h-2.5 w-28 rounded-full bg-white/55" />
                        <div className="h-2.5 w-16 rounded-full bg-[#18ef0f]/80" />
                      </div>
                    </div>

                    <div className="absolute bottom-5 left-5 rounded-[22px] bg-white/88 px-4 py-3 text-sm font-medium text-[#1b3d37] backdrop-blur-sm shadow-[0_16px_34px_rgba(10,34,29,0.12)]">
                      Scan packaged foods. Understand labels. Choose with confidence.
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-8 rounded-[28px] bg-white/10 p-4 text-white/90 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 flex-none" />
                  <p className="text-sm leading-6">
                    Personalized guidance begins with your health profile, then continues through every scan and saved report.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="relative flex flex-col justify-center px-6 py-8 sm:px-8 lg:px-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(39,220,24,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(94,199,255,0.08),transparent_32%)]" />
            <div className="relative z-10 mx-auto w-full max-w-md">
              <div className="mb-8 text-center">
                <h1
                  className="text-4xl font-semibold tracking-[-0.05em] text-[#111827] sm:text-[3.35rem]"
                  style={{ fontFamily: "'Lexend', 'Inter', sans-serif" }}
                >
                  {title}
                  <span className="block text-[#18df13]">{accentTitle}</span>
                </h1>
                <p className="mx-auto mt-4 max-w-sm text-lg leading-8 text-[#5f6c83]">{subtitle}</p>
              </div>

              <div className="mt-8">{children}</div>

              <div className="mt-8 text-center text-lg text-[#6a768b]">
                {secondaryText}{' '}
                <button
                  onClick={secondaryAction}
                  className="font-semibold text-[#18df13]"
                >
                  {secondaryActionLabel}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
