import type { CareerRoleDefinition, LearningResource } from "./careerEngine";

export const CAREER_ROLES: CareerRoleDefinition[] = [
{
    id: 'backend_developer',
    name: 'Backend Developer',
    description: 'Build APIs, data layers, and reliable backend services.',
    requiredSkills: ['Node.js', 'Express', 'SQL', 'PostgreSQL', 'REST API', 'Docker', 'Git'],
    suggestedTools: ['Postman', 'pgAdmin', 'Docker Desktop', 'VS Code'],
    growthPath: ['Junior Backend Developer', 'Backend Developer', 'Senior Backend Engineer'],
    track: 'software',
    recommendedFor: ['CSE', 'IT', 'ECE'],
    roadmapSource: 'roadmap.sh + official docs',
    yearGuidance: [
      'Start with programming and SQL in early semesters, then move into APIs and deployment.',
      'By third year, build at least two backend-heavy portfolio projects with databases.',
    ],
  },
  {
    id: 'frontend_developer',
    name: 'Frontend Developer',
    description: 'Build interactive and accessible user interfaces.',
    requiredSkills: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Responsive Design', 'Git'],
    suggestedTools: ['Figma', 'VS Code', 'Chrome DevTools', 'Vite'],
    growthPath: ['Junior Frontend Developer', 'Frontend Developer', 'Senior Frontend Engineer'],
    track: 'software',
    recommendedFor: ['CSE', 'IT', 'ECE'],
    roadmapSource: 'roadmap.sh + official docs',
    yearGuidance: [
      'Use first and second year to build fundamentals, then focus on projects and responsive UI.',
      'By final year, your portfolio should show two polished apps and strong Git discipline.',
    ],
  },
  {
    id: 'full_stack_developer',
    name: 'Full Stack Developer',
    description: 'Combine frontend, backend, database, and deployment skills into end-to-end product delivery.',
    requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Express', 'SQL', 'Git'],
    suggestedTools: ['VS Code', 'Postman', 'Docker Desktop', 'Chrome DevTools'],
    growthPath: ['Junior Full Stack Developer', 'Full Stack Developer', 'Product Engineer'],
    track: 'software',
    recommendedFor: ['CSE', 'IT', 'ECE'],
    roadmapSource: 'roadmap.sh + official docs',
    yearGuidance: [
      'Build web fundamentals first, then connect frontend and backend through real projects.',
      'Use third and fourth year for deployment, auth, and interview-ready full stack apps.',
    ],
  },
  {
    id: 'data_analyst',
    name: 'Data Analyst',
    description: 'Analyze datasets and deliver business insights.',
    requiredSkills: ['Python', 'SQL', 'Excel', 'Pandas', 'Data Visualization', 'Statistics', 'Git'],
    suggestedTools: ['Jupyter Notebook', 'Power BI', 'Tableau', 'Google Colab'],
    growthPath: ['Junior Data Analyst', 'Data Analyst', 'Senior Data Analyst'],
    track: 'software',
    recommendedFor: ['CSE', 'IT', 'ECE', 'EEE'],
    roadmapSource: 'roadmap.sh + Microsoft Learn',
    yearGuidance: [
      'Start with Python and spreadsheets, then move into SQL and dashboard storytelling.',
      'By placement season, be ready with one dashboard project and one business-style case study.',
    ],
  },
  {
    id: 'embedded_systems_engineer',
    name: 'Embedded Systems Engineer',
    description: 'Work on firmware, microcontrollers, hardware interfaces, and real-time device behavior.',
    requiredSkills: ['C Programming', 'Microcontrollers', 'Embedded C', 'Digital Electronics', 'RTOS', 'IoT', 'Git'],
    suggestedTools: ['Arduino IDE', 'PlatformIO', 'VS Code', 'Logic Analyzer'],
    growthPath: ['Embedded Intern', 'Embedded Systems Engineer', 'Firmware Engineer'],
    track: 'electronics',
    recommendedFor: ['ECE', 'EEE', 'CSE'],
    roadmapSource: 'Esencelab + official hardware docs',
    yearGuidance: [
      'Build C and circuit basics early, then move into boards, sensors, and firmware debugging.',
      'Final-year students should target one end-to-end device project with documentation and testing.',
    ],
  },
  {
    id: 'electronics_communication_engineer',
    name: 'Electronics and Communication Track',
    description: 'Strengthen core electronics, communication systems, and practical lab-to-project readiness.',
    requiredSkills: ['Circuit Analysis', 'Analog Electronics', 'Digital Electronics', 'Signals and Systems', 'Communication Systems', 'Embedded C', 'Microcontrollers'],
    suggestedTools: ['LTspice', 'Arduino IDE', 'Oscilloscope', 'MATLAB or Scilab'],
    growthPath: ['ECE Intern', 'Electronics Engineer', 'Communication Systems Engineer'],
    track: 'electronics',
    recommendedFor: ['ECE', 'EEE'],
    roadmapSource: 'Esencelab + SWAYAM NPTEL + official tools',
    yearGuidance: [
      'First and second year should focus on circuits, signals, and digital basics.',
      'By third and fourth year, convert theory into lab simulations, embedded projects, and interview answers.',
    ],
  },
  {
    id: 'electrical_core_engineer',
    name: 'Electrical Core Track',
    description: 'Build a strong electrical engineering base across circuits, control, power, and instrumentation.',
    requiredSkills: ['Circuit Analysis', 'Control Systems', 'Power Systems', 'Instrumentation', 'Electrical Machines', 'MATLAB', 'Technical Communication'],
    suggestedTools: ['LTspice', 'MATLAB or Scilab', 'Multisim', 'Excel'],
    growthPath: ['Electrical Intern', 'Graduate Engineer Trainee', 'Electrical Design Engineer'],
    track: 'electrical',
    recommendedFor: ['EEE', 'ECE'],
    roadmapSource: 'Esencelab + SWAYAM NPTEL + official tools',
    yearGuidance: [
      'Early years should build strong theory and numericals in circuits and machines.',
      'Later years should focus on simulations, instrumentation practice, and placement-ready explanations.',
    ],
  },
];


export const SKILL_RESOURCES: Record<string, LearningResource[]> = {
frontend: [
    {
      title: 'roadmap.sh Frontend Roadmap',
      provider: 'roadmap.sh',
      url: 'https://roadmap.sh/frontend',
    },
  ],
  'node.js': [
    {
      title: 'Introduction to Node.js',
      provider: 'Node.js',
      url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs',
    },
  ],
  express: [
    {
      title: 'Express Starter Guide',
      provider: 'Express',
      url: 'https://expressjs.com/en/starter/installing.html',
    },
  ],
  'c programming': [
    {
      title: 'Learn C Programming',
      provider: 'freeCodeCamp',
      url: 'https://www.freecodecamp.org/news/tag/c-programming/',
    },
  ],
  sql: [
    {
      title: 'PostgreSQL SQL Tutorial',
      provider: 'PostgreSQL',
      url: 'https://www.postgresql.org/docs/current/tutorial-sql.html',
    },
  ],
  postgresql: [
    {
      title: 'PostgreSQL SQL Tutorial',
      provider: 'PostgreSQL',
      url: 'https://www.postgresql.org/docs/current/tutorial-sql.html',
    },
  ],
  'rest api': [
    {
      title: 'MDN HTTP Overview',
      provider: 'MDN',
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview',
    },
  ],
  react: [
    {
      title: 'React Docs - Learn',
      provider: 'React',
      url: 'https://react.dev/learn',
    },
  ],
  'full stack': [
    {
      title: 'roadmap.sh Full Stack Roadmap',
      provider: 'roadmap.sh',
      url: 'https://roadmap.sh/full-stack',
    },
  ],
  typescript: [
    {
      title: 'TypeScript Handbook',
      provider: 'Microsoft',
      url: 'https://www.typescriptlang.org/docs/',
    },
  ],
  javascript: [
    {
      title: 'JavaScript Guide',
      provider: 'MDN',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
    },
  ],
  html: [
    {
      title: 'MDN Learn HTML',
      provider: 'MDN',
      url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
    },
  ],
  css: [
    {
      title: 'web.dev Learn Design',
      provider: 'Google web.dev',
      url: 'https://web.dev/learn/design',
    },
    {
      title: 'MDN Learn Web Development',
      provider: 'MDN',
      url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
    },
  ],
  'responsive design': [
    {
      title: 'web.dev Learn Design',
      provider: 'Google web.dev',
      url: 'https://web.dev/learn/design',
    },
  ],
  python: [
    {
      title: 'Python Tutorial',
      provider: 'Python',
      url: 'https://docs.python.org/3/tutorial/',
    },
  ],
  pandas: [
    {
      title: 'Pandas Intro Tutorials',
      provider: 'Pandas',
      url: 'https://pandas.pydata.org/docs/getting_started/intro_tutorials/index.html',
    },
  ],
  excel: [
    {
      title: 'Excel Video Training',
      provider: 'Microsoft',
      url: 'https://support.microsoft.com/en-us/excel',
    },
  ],
  docker: [
    {
      title: 'Docker 101 Tutorial',
      provider: 'Docker',
      url: 'https://www.docker.com/101-tutorial/',
    },
  ],
  git: [
    {
      title: 'Pro Git Book',
      provider: 'Git',
      url: 'https://git-scm.com/book/en/v2',
    },
  ],
  'data visualization': [
    {
      title: 'Power BI Learning Path',
      provider: 'Microsoft Learn',
      url: 'https://learn.microsoft.com/en-us/training/powerplatform/power-bi/',
    },
  ],
  statistics: [
    {
      title: 'Intro to Statistics',
      provider: 'Khan Academy',
      url: 'https://www.khanacademy.org/math/statistics-probability',
    },
  ],
  'circuit analysis': [
    {
      title: 'LTspice Simulator',
      provider: 'Analog Devices',
      url: 'https://www.analog.com/en/design-center/design-tools-and-calculators/ltspice-simulator.html',
    },
  ],
  'analog electronics': [
    {
      title: 'LTspice Simulator',
      provider: 'Analog Devices',
      url: 'https://www.analog.com/en/design-center/design-tools-and-calculators/ltspice-simulator.html',
    },
  ],
  'digital electronics': [
    {
      title: 'SWAYAM NPTEL Catalog',
      provider: 'SWAYAM NPTEL',
      url: 'https://www.swayam.gov.in/nc_details/NPTEL',
    },
  ],
  'signals and systems': [
    {
      title: 'SWAYAM NPTEL Catalog',
      provider: 'SWAYAM NPTEL',
      url: 'https://www.swayam.gov.in/nc_details/NPTEL',
    },
  ],
  'communication systems': [
    {
      title: 'SWAYAM NPTEL Catalog',
      provider: 'SWAYAM NPTEL',
      url: 'https://www.swayam.gov.in/nc_details/NPTEL',
    },
  ],
  'microcontrollers': [
    {
      title: 'Arduino Learn',
      provider: 'Arduino',
      url: 'https://docs.arduino.cc/learn/',
    },
  ],
  'embedded c': [
    {
      title: 'ESP-IDF Get Started',
      provider: 'Espressif',
      url: 'https://docs.espressif.com/projects/esp-idf/en/stable/esp32/get-started/',
    },
  ],
  rtos: [
    {
      title: 'ESP-IDF Get Started',
      provider: 'Espressif',
      url: 'https://docs.espressif.com/projects/esp-idf/en/stable/esp32/get-started/',
    },
  ],
  iot: [
    {
      title: 'Arduino Learn',
      provider: 'Arduino',
      url: 'https://docs.arduino.cc/learn/',
    },
  ],
  'control systems': [
    {
      title: 'SWAYAM NPTEL Catalog',
      provider: 'SWAYAM NPTEL',
      url: 'https://www.swayam.gov.in/nc_details/NPTEL',
    },
  ],
  'power systems': [
    {
      title: 'SWAYAM NPTEL Catalog',
      provider: 'SWAYAM NPTEL',
      url: 'https://www.swayam.gov.in/nc_details/NPTEL',
    },
  ],
  instrumentation: [
    {
      title: 'SWAYAM NPTEL Catalog',
      provider: 'SWAYAM NPTEL',
      url: 'https://www.swayam.gov.in/nc_details/NPTEL',
    },
  ],
  'electrical machines': [
    {
      title: 'SWAYAM NPTEL Catalog',
      provider: 'SWAYAM NPTEL',
      url: 'https://www.swayam.gov.in/nc_details/NPTEL',
    },
  ],
  matlab: [
    {
      title: 'Scilab Tutorials',
      provider: 'Scilab',
      url: 'https://www.scilab.org/tutorials',
    },
  ],
  'technical communication': [
    {
      title: 'Career Development',
      provider: 'Microsoft Learn',
      url: 'https://learn.microsoft.com/en-us/training/career-paths/',
    },
  ],
};
