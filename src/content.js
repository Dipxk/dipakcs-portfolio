export const site = {
  name: 'Dipak Kumar',
  line: 'University of Ottawa · Computer Science',
  place: 'Ottawa',
  email: 'Dipakcsel@gmail.com',
  phone: '(613) 854-0508',
  github: 'https://github.com/Dipxk',
  linkedin: 'https://www.linkedin.com/in/dipak-cs/',
  resume: '/Dipak_Kumar_Resume.pdf',
  live: 'https://grid-runner-vnj2.onrender.com',
  about:
    'Computer Science at the University of Ottawa. I care about software that has to hold up — tests that catch real bugs, backends that stay up, products people actually open. Right now that means Python and C/C++ at Deltek, and on my own time real-time systems, full-stack product work, and live tools like Grid Runner.',
  now: 'Software engineer.',
  skills: [
    'Python',
    'C/C++',
    'JavaScript',
    'React',
    'Flutter',
    'FastAPI',
    'Docker',
    'Firebase',
    'Jira',
  ],
}

export const jobs = [
  {
    org: 'Deltek',
    role: 'Software Engineering Intern (Co-op)',
    when: 'Ottawa · May 2026 — now',
    punch: 80,
    suffix: '%',
    label: 'coverage',
    bullets: [
      'Developed Python automation and debugged C/C++ application code to build regression and edge-case tests validating feature behavior, error handling, and software stability.',
      'Diagnosed software defects by reproducing failed scenarios, analyzing logs, tracing failures through application code, and partnering with developers to validate fixes before closing issues in Jira.',
      'Expanded automated regression coverage by 80% by adding new test scenarios, reviewing Git changes, and using AI-assisted tools to identify edge cases and accelerate debugging within an Agile workflow.',
    ],
  },
  {
    org: 'LoyaltyValet',
    role: 'Founding Engineer',
    when: 'Ottawa · May 2025 — Aug 2025',
    punch: 12000,
    suffix: '+',
    label: 'users · $120K ARR',
    bullets: [
      'Built and shipped full-stack features across React, Flutter, and Firebase, supporting a platform with 12,000+ registered users and roughly $120K ARR across 8 retail clients.',
      'Developed a React administrative dashboard and automated merchant onboarding workflows, reducing setup time by 75% and improving operational consistency across client accounts.',
      'Worked within a fast-moving startup to scope, debug, and iterate on production features, translating changing product requirements into reliable customer-facing functionality.',
    ],
  },
  {
    org: 'Mer Lab, uOttawa',
    role: 'Research Assistant',
    when: 'Ottawa · Jan 2026 — Apr 2026',
    punch: 11,
    suffix: '',
    label: 'datasets',
    bullets: [
      'Designed a containerized Python and Docker data pipeline for reproducible preprocessing and model training across 11 biological datasets.',
      'Built automated data-validation workflows to detect inconsistencies, standardize preprocessing outputs, and improve reproducibility for research supporting a Faculty of Medicine publication.',
    ],
  },
]

export const work = [
  {
    title: 'Grid Runner',
    kind: 'Live',
    copy: 'A hundred robots on one warehouse floor. Block a path — they move around it. Nobody collides.',
    href: 'https://github.com/Dipxk/grid-runner',
    live: 'https://grid-runner-vnj2.onrender.com',
  },
  {
    title: 'RAG Document Q&A',
    kind: 'GitHub',
    copy: 'Ask a document a question. It answers with sources, in under two seconds.',
    href: 'https://github.com/Dipxk/RAG-Project',
  },
  {
    title: 'Real-time alarm',
    kind: 'Embedded',
    copy: 'C and Assembly on a Dragon-12. Keypad, LCD, speaker, hardware timers — it has to hit the beat.',
    href: null,
  },
]
