# Grant landscape (UK)

**Researched: 2 October 2026.** Schemes change often. Check every date, amount and rule on the official page before acting. This is a shortlist and a preparation guide, not legal or financial advice.

---

## Shortlist

| Scheme | Fit for Clarity | Amount | Eligibility, as published | Timing |
|---|---|---|---|---|
| **[Royal Academy of Engineering Enterprise Fellowships](https://enterprisehub.raeng.org.uk/programmes/enterprise-fellowships/eligibility/)**, Recent Graduates route | **Strongest.** Peter's first degree was completed in July 2025 | £50,000 cash prize plus support: mentoring by an RAEng Fellow, about 15 days of training, workspace and investor networks (per the [January 2026 guidance](https://enterprisehub.raeng.org.uk/media/omzdbrao/enterprise-fellowships-guidance-january-2026.pdf); check the next round's guidance) | See notes 1–6 below | **Closed when checked on 2 Oct 2026.** RAEng opens applications "in January and July each year" ([how to apply](https://enterprisehub.raeng.org.uk/programmes/enterprise-fellowships/how-to-apply/)), so the next window is expected in January 2027. For reference, the January 2026 round's stage-one deadline was 16 Feb 2026. Sign up for RAEng's alert |
| **[UnLtd Awards](https://unltd.org.uk/awards/)**: Funding Futures (ages 16–30) or Millennium Awards Trust (16+) | Good if Clarity is framed as a social venture | Starting Up up to £8,000. Scaling Up up to £18,000, including living costs | Aged 16+ (Millennium Awards Trust) or 16–30 (Funding Futures); the right to live and work in the UK for the 12-month award period; **no legal structure is needed to apply, and ideas are eligible**; the activity must not have been running for more than four years; it must create positive social impact (franchises aren't eligible). Start with UnLtd's eligibility checker | **Closes 30 Nov 2026, 10:00**, or earlier if it reaches capacity |
| **[Innovate UK Growth Catalyst: Early Stage, New Innovators](https://apply-for-innovation-funding.service.gov.uk/competition/2220/overview/bcfd2780-f307-4434-be32-46889a239024)** | Possible. AI is one of its five critical technology areas | £25k–£50k, 100% of costs (pilot round) | UK-registered micro or small business; no individual applicants; a clear route to commercialisation | The pilot round closed 6 Aug 2025. Watch the Innovation Funding Service for a rerun |
| [Innovate UK Smart grants](https://casrai.org/guides/innovate-uk-smart-grants) | No | — | Paused since January 2025; no reinstatement announced as of July 2026 | — |
| [Innovate UK Young Innovators](https://iuk-business-connect.org.uk/programme/young-innovators/) | No | — | Programme closed. It ran from 2018 to 2024 | — |
| [NLnet NGI Zero Commons Fund](https://nlnet.nl/commonsfund/) | No | — | Final call closed 1 June 2026 | — |
| The King's Trust Enterprise programme | Possible (ages 18–30) | Business support; start-up grants in some cases | Check eligibility at [kingstrust.org.uk](https://www.kingstrust.org.uk/how-we-can-help/courses/enterprise/london) | Rolling |
| AWS Activate (credits, not cash) | Useful. Stretches the ~£20/month budget | Credits for self-funded founders. Check the current amount | AWS Activate application | Rolling |

**RAEng eligibility notes** (RAEng's eligibility page, FAQ and January 2026 guidance, checked 2 Oct 2026):
1. Your first university degree was completed no earlier than 1 January 2021. A July 2025 degree qualifies.
2. Based in the UK or Ireland.
3. You must be CEO for at least the length of the programme. The business doesn't need to be incorporated yet.
4. Less than £500k of private investment raised.
5. Must be "protectable, IP-rich engineering and/or technology innovation" at TRL 4 or higher, with a minimum viable product expected within three years. For software, it must be "sufficiently complex that a skilled programmer couldn't independently replicate it". An AI agent must be your own creation, not just a commercial tool.
6. **Generative-AI tools used to write the application must be acknowledged**: name the tool and describe how it was used. The guidance also says "the application must primarily represent the applicant's own work".

---

## What reviewers score, and what the backend has to prove

RAEng scores six dimensions. Most other schemes ask versions of the same questions. Each one maps onto evidence this build should produce:

| Reviewers ask about | Evidence the backend plan produces |
|---|---|
| Your commitment and entrepreneurial potential | The decision log and ADRs, with each decision recorded in Peter's own words; a visible, steady delivery history |
| The team | Named advisers and co-design participants from the pilot (solo founders are normal, but show who you learn from) |
| Engineering quality and readiness to commercialise | A deployed staging environment, CI, test and coverage reports, SLO dashboards, load-test results, the threat model, the DPIA |
| **Defensible IP** | **Clarity's own algorithms, documented and benchmarked:** the deterministic retrieval engine, typo-tolerant and phonetic search, the attention-budget notification scheduler, ADHD-tuned review scheduling, and the privacy architecture. **Calls to a commercial LLM are not your IP.** Lead with what you built. |
| Market evidence and scale | Waitlist numbers, pilot usage measures (aggregate only), SUS and NASA-TLX results, and interviews with disability services and DSA assessors |
| Go-to-market and business model | Consumer plus institutional (universities, disability services, the DSA and Access to Work channels), backed by a cost per active user from the cost model |

---

## Prepare now

- **Decide whether to incorporate, and how.** Growth Catalyst needs a company. UnLtd and RAEng don't require one to apply. A CIC and a Ltd company carry different obligations, so take advice before choosing.
- **Be straightforward about AI assistance.** RAEng requires applicants to name any generative-AI tool used to *write the application* and say how it was used. That rule doesn't cover AI used to build the product, but being open about it is the safer course. "AI-assisted development, with every architectural decision mine and recorded in the decision log" is a strong statement, and the decision log and ADRs are the evidence for it.
- **Data protection basics before real users:**
  - pay the ICO data protection fee;
  - complete the DPIA;
  - publish a plain-language privacy notice.

  All three are scheduled in the backend roadmap.
- **Cyber Essentials** costs from about £320 for a micro business and is often expected in public-sector and university procurement.

## Suggested sequence

1. **By 30 November, 10:00, or earlier if UnLtd reaches capacity:** UnLtd, if the social-venture route suits you and you're eligible. Use the Phase 4–5 evidence: a deployed staging environment, the data-integrity guarantees, and this evidence base.
2. **Prepare in December, then apply when RAEng's next window opens** (expected January 2027; confirm the deadline when it opens): the RAEng Enterprise Fellowship, Recent Graduates route. Use the Phase 6–7 evidence: the pilot plan, the IP narrative, the cost model.
3. **Ongoing:** watch the Innovation Funding Service for a Growth Catalyst rerun in the AI area. This needs a company.
