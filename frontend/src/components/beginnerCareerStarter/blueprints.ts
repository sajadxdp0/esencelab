export type BeginnerTrackRanking = ReturnType<typeof rankBeginnerTracks>;

export type BeginnerAnswers = {
  year: '1st year' | '2nd year' | '3rd year' | '4th year';
  branch: 'cse_it' | 'ece' | 'eee' | 'other';
  workStyle: 'interfaces' | 'logic' | 'insights' | 'devices' | 'core';
  favoriteTask: 'design' | 'build' | 'analyze' | 'tinker' | 'circuits';
  strength: 'communication' | 'logic' | 'math' | 'hands_on' | 'patience';
};

export interface BeginnerBlueprint {
  id: string;
  name: string;
  overview: string;
  fitSummary: string;
  resumeSections: string[];
  starterSkills: string[];
  starterProjects: string[];
  firstSteps: string[];
}

/** Static beginner-track catalog and answer weighting. */

export const beginnerBlueprints: Record<string, BeginnerBlueprint> = {
  frontend_developer: {
    id: 'frontend_developer',
    name: 'Frontend Developer',
    overview: 'Best for students who enjoy interfaces, polish, and turning ideas into usable screens.',
    fitSummary: 'You are leaning toward UI work, user experience, and portfolio-ready web projects.',
    resumeSections: ['Education', 'Technical Skills', 'Projects', 'Achievements', 'Links'],
    starterSkills: ['HTML', 'CSS', 'JavaScript', 'React', 'Responsive Design'],
    starterProjects: ['Portfolio website', 'Landing page clone', 'Student dashboard UI'],
    firstSteps: [
      'Start with HTML, CSS, and JavaScript fundamentals.',
      'Build two responsive mini-projects before learning advanced frameworks.',
      'Keep screenshots and live links for every project.',
    ],
  },
  backend_developer: {
    id: 'backend_developer',
    name: 'Backend Developer',
    overview: 'Best for students who enjoy logic, APIs, data flow, and system building more than visuals.',
    fitSummary: 'You are leaning toward server-side problem solving, databases, and application logic.',
    resumeSections: ['Education', 'Technical Skills', 'Projects', 'Internships or Labs', 'Links'],
    starterSkills: ['Node.js', 'Express', 'SQL', 'REST API', 'Git'],
    starterProjects: ['Student records API', 'Authentication service', 'Job board backend'],
    firstSteps: [
      'Learn one backend runtime and one database properly.',
      'Build small CRUD APIs with authentication and documentation.',
      'Practice explaining architecture decisions clearly on your resume.',
    ],
  },
  full_stack_developer: {
    id: 'full_stack_developer',
    name: 'Full Stack Developer',
    overview: 'Best for students who want to build complete products end to end and like variety.',
    fitSummary: 'You are leaning toward balanced product building across UI, APIs, and deployment.',
    resumeSections: ['Education', 'Technical Skills', 'Full Projects', 'Experience', 'Links'],
    starterSkills: ['React', 'Node.js', 'SQL', 'Git', 'Deployment'],
    starterProjects: ['Full stack task manager', 'Placement tracker app', 'Campus event portal'],
    firstSteps: [
      'Get comfortable with both browser and backend basics before scaling up.',
      'Build one complete product with login, data storage, and deployment.',
      'Use GitHub and write project notes that explain your impact.',
    ],
  },
  data_analyst: {
    id: 'data_analyst',
    name: 'Data Analyst',
    overview: 'Best for students who enjoy patterns, numbers, dashboards, and explaining insights clearly.',
    fitSummary: 'You are leaning toward analysis, reporting, and turning data into decisions.',
    resumeSections: ['Education', 'Technical Skills', 'Projects', 'Certifications', 'Links'],
    starterSkills: ['Python', 'SQL', 'Excel', 'Statistics', 'Data Visualization'],
    starterProjects: ['Sales dashboard', 'Placement trend analysis', 'Survey insights report'],
    firstSteps: [
      'Start with Python, spreadsheets, SQL, and basic statistics together.',
      'Build one project that ends with a dashboard or recommendation.',
      'Show numbers, findings, and decision impact in your resume bullets.',
    ],
  },
  embedded_systems_engineer: {
    id: 'embedded_systems_engineer',
    name: 'Embedded Systems Engineer',
    overview: 'Best for students who enjoy devices, firmware, sensors, and practical electronics projects.',
    fitSummary: 'You are leaning toward microcontrollers, hardware-software integration, and hands-on building.',
    resumeSections: ['Education', 'Technical Skills', 'Lab or Hardware Projects', 'Achievements', 'Links'],
    starterSkills: ['C Programming', 'Embedded C', 'Microcontrollers', 'IoT', 'RTOS basics'],
    starterProjects: ['Smart sensor node', 'IoT monitoring system', 'ESP32 automation project'],
    firstSteps: [
      'Learn C well before moving deeper into firmware work.',
      'Start with Arduino or ESP32 projects and document wiring plus outcomes.',
      'Show project photos, metrics, and hardware tools in your resume.',
    ],
  },
  electronics_communication_engineer: {
    id: 'electronics_communication_engineer',
    name: 'ECE Core / Communication',
    overview: 'Best for students who enjoy signals, circuits, communication systems, and electronics labs.',
    fitSummary: 'You are leaning toward electronics concepts with strong placement value in communication and embedded-adjacent roles.',
    resumeSections: ['Education', 'Core Skills', 'Mini Projects', 'Lab Work', 'Achievements'],
    starterSkills: ['Signals and Systems', 'Digital Electronics', 'Communication Systems', 'Microcontrollers'],
    starterProjects: ['Signal processing demo', 'Digital communication mini-project', 'Embedded communication node'],
    firstSteps: [
      'Strengthen fundamentals in signals, digital electronics, and communication.',
      'Support theory with simulations and mini hardware builds.',
      'Write project bullets around outcomes, not only components used.',
    ],
  },
  electrical_core_engineer: {
    id: 'electrical_core_engineer',
    name: 'EEE Core / Electrical Systems',
    overview: 'Best for students who enjoy circuits, control, machines, instrumentation, and applied electrical systems.',
    fitSummary: 'You are leaning toward electrical fundamentals, simulation, and practical system understanding.',
    resumeSections: ['Education', 'Core Skills', 'Projects', 'Lab Work', 'Achievements'],
    starterSkills: ['Circuit Analysis', 'Control Systems', 'Power Systems', 'Instrumentation'],
    starterProjects: ['Motor control mini-project', 'Power monitoring dashboard', 'Control system simulation'],
    firstSteps: [
      'Build strong fundamentals in circuits, machines, and control systems.',
      'Use simulations and practical experiments to support theory.',
      'Include measurable project outcomes and tools on your resume.',
    ],
  },
};

export const beginnerWeights: Record<keyof BeginnerAnswers, Record<string, string[]>> = {
  year: {
    '1st year': ['frontend_developer', 'data_analyst', 'embedded_systems_engineer'],
    '2nd year': ['full_stack_developer', 'backend_developer', 'electronics_communication_engineer'],
    '3rd year': ['full_stack_developer', 'backend_developer', 'electrical_core_engineer'],
    '4th year': ['backend_developer', 'data_analyst', 'electronics_communication_engineer'],
  },
  branch: {
    cse_it: ['frontend_developer', 'backend_developer', 'full_stack_developer', 'data_analyst'],
    ece: ['embedded_systems_engineer', 'electronics_communication_engineer', 'frontend_developer'],
    eee: ['electrical_core_engineer', 'embedded_systems_engineer', 'data_analyst'],
    other: ['full_stack_developer', 'data_analyst', 'frontend_developer'],
  },
  workStyle: {
    interfaces: ['frontend_developer', 'full_stack_developer'],
    logic: ['backend_developer', 'full_stack_developer'],
    insights: ['data_analyst'],
    devices: ['embedded_systems_engineer', 'electronics_communication_engineer'],
    core: ['electronics_communication_engineer', 'electrical_core_engineer'],
  },
  favoriteTask: {
    design: ['frontend_developer', 'full_stack_developer'],
    build: ['backend_developer', 'full_stack_developer'],
    analyze: ['data_analyst'],
    tinker: ['embedded_systems_engineer', 'electronics_communication_engineer'],
    circuits: ['electronics_communication_engineer', 'electrical_core_engineer'],
  },
  strength: {
    communication: ['frontend_developer', 'data_analyst'],
    logic: ['backend_developer', 'full_stack_developer'],
    math: ['data_analyst', 'electronics_communication_engineer', 'electrical_core_engineer'],
    hands_on: ['embedded_systems_engineer', 'electronics_communication_engineer'],
    patience: ['electrical_core_engineer', 'backend_developer'],
  },
};

export const defaultAnswers: BeginnerAnswers = {
  year: '1st year',
  branch: 'cse_it',
  workStyle: 'interfaces',
  favoriteTask: 'design',
  strength: 'communication',
};

export const rankBeginnerTracks = (answers: BeginnerAnswers) => {
  const scores = new Map<string, number>();
  Object.keys(beginnerBlueprints).forEach((roleId) => {
    scores.set(roleId, 0);
  });

  (Object.keys(beginnerWeights) as Array<keyof BeginnerAnswers>).forEach((key) => {
    const weightedRoles = beginnerWeights[key][answers[key]] || [];
    weightedRoles.forEach((roleId, index) => {
      const bonus = index === 0 ? 4 : index === 1 ? 3 : 2;
      scores.set(roleId, (scores.get(roleId) || 0) + bonus);
    });
  });

  return Array.from(scores.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([roleId, score]) => ({
      roleId,
      score,
      blueprint: beginnerBlueprints[roleId],
    }));
};
