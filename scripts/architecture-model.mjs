// The architecture page's diagrams as code. Elements carry either a literal
// `name` (repo names are not translated) or a `label` key into
// src/landing/architecture/copy.js; `sub` is the smaller line under it and
// `tag` the mono line above it. `repo` and `groups` tie an element to
// khe-architecture ESTATE.md and the khe-homelab service groups; check.mjs
// fails when the two sides disagree. The repo elements appear in no view: they
// feed the building-block rows under the estate diagram.

export const elements = {
  people: { kind: 'boundary', label: 'groupPeople', style: 'band' },
  host: { kind: 'boundary', label: 'groupHost', style: 'host', repo: 'khe-homelab' },
  outside: { kind: 'boundary', label: 'groupOutside', style: 'dashed' },
  household: { kind: 'person', label: 'elHousehold', sub: 'elHouseholdSub' },
  visitors: { kind: 'person', label: 'elVisitors', sub: 'elVisitorsSub' },
  guests: { kind: 'person', label: 'elGuests', sub: 'elGuestsSub' },
  cloudflare: { kind: 'external', label: 'elCloudflare', sub: 'elCloudflareSub' },
  edge: { kind: 'platform', label: 'elEdge', sub: 'elEdgeSub', groups: ['core'] },
  runtime: { kind: 'platform', label: 'elRuntime', sub: 'elRuntimeSub', groups: ['apps'] },
  family: { kind: 'platform', label: 'elFamily', sub: 'elFamilySub', groups: ['media'] },
  observability: { kind: 'platform', label: 'elObservability', sub: 'elObservabilitySub', groups: ['observability'] },
  backup: { kind: 'platform', label: 'elBackup', sub: 'elBackupSub' },
  runner: { kind: 'platform', label: 'elRunner', sub: 'elRunnerSub' },
  house: { kind: 'platform', label: 'elHouse', sub: 'elHouseSub', groups: ['home'] },
  github: { kind: 'external', label: 'elGithub', sub: 'elGithubSub' },
  r2: { kind: 'external', label: 'elR2', sub: 'elR2Sub' },
  telegram: { kind: 'external', label: 'elTelegram', sub: 'elTelegramSub' },
  aiApis: { kind: 'external', label: 'elAiApis', sub: 'elAiApisSub' },

  'khe-study': { kind: 'product', name: 'khe-study', repo: 'khe-study' },
  'khe-ai-adventure': { kind: 'product', name: 'khe-ai-adventure', repo: 'khe-ai-adventure' },
  'khe-trips': { kind: 'product', name: 'khe-trips', repo: 'khe-trips' },
  'khe-sites': { kind: 'product', name: 'khe-sites', repo: 'khe-sites' },
  'khe-ui': { kind: 'repo', name: 'khe-ui', repo: 'khe-ui' },
  'khe-workspace': { kind: 'repo', name: 'khe-workspace', repo: 'khe-workspace' },
  'khe-architecture': { kind: 'repo', name: 'khe-architecture', repo: 'khe-architecture' },
  'khe-meta': { kind: 'repo', name: 'khe-meta', repo: 'khe-meta' },
  khelias: { kind: 'repo', name: 'khelias', repo: 'khelias' },
  'ha-estfeed': { kind: 'repo', name: 'ha-estfeed', repo: 'ha-estfeed' },
  'khe-home-assistant': { kind: 'repo', name: 'khe-home-assistant', repo: 'khe-home-assistant' },

  fromPush: { kind: 'boundary', label: 'groupFromPush', style: 'rule' },
  gate: { kind: 'step', owner: 'machine', tag: 'tagHook', label: 'elGate', sub: 'elGateSub' },
  push: { kind: 'step', owner: 'person', tag: 'tagPerson', label: 'elPush', sub: 'elPushSub' },
  ci: { kind: 'step', owner: 'machine', tag: 'tagCi', label: 'elCi', sub: 'elCiSub' },
  ghcr: { kind: 'step', owner: 'machine', tag: 'tagRegistry', label: 'elGhcr', sub: 'elGhcrSub' },
  pinPr: { kind: 'step', owner: 'machine', tag: 'tagHomelab', label: 'elPinPr', sub: 'elPinPrSub' },
  deploy: { kind: 'step', owner: 'machine', tag: 'tagVm', label: 'elDeploy', sub: 'elDeploySub' },

  stepLoop: { kind: 'boundary', label: 'groupStepLoop', style: 'dashed' },
  afterSteps: { kind: 'boundary', label: 'groupAfterSteps', style: 'rule' },
  runPlan: { kind: 'step', owner: 'agent', tag: 'tagAgent', label: 'elRunPlan', sub: 'elRunPlanSub' },
  planReview: { kind: 'step', owner: 'agent', tag: 'tagSubagent', label: 'elPlanReview', sub: 'elPlanReviewSub' },
  goalSet: { kind: 'step', owner: 'person', tag: 'tagPerson', label: 'elGoalSet', sub: 'elGoalSetSub' },
  stepChange: { kind: 'step', owner: 'agent', tag: 'tagAgent', label: 'elStepChange', sub: 'elStepChangeSub' },
  stepCheck: { kind: 'step', owner: 'agent', tag: 'tagAgent', label: 'elStepCheck', sub: 'elStepCheckSub' },
  stepBrowser: { kind: 'step', owner: 'agent', tag: 'tagAgent', label: 'elStepBrowser', sub: 'elStepBrowserSub' },
  planDiff: { kind: 'step', owner: 'agent', tag: 'tagSubagent', label: 'elPlanDiff', sub: 'elPlanDiffSub' },
  simplify: { kind: 'step', owner: 'agent', tag: 'tagAgent', label: 'elSimplify', sub: 'elSimplifySub' },
  codeReview: { kind: 'step', owner: 'agent', tag: 'tagAgent', label: 'elCodeReview', sub: 'elCodeReviewSub' },
  retro: { kind: 'step', owner: 'agent', tag: 'tagAgent', label: 'elRetro', sub: 'elRetroSub' },
  goalMet: { kind: 'step', owner: 'agent', tag: 'tagEvaluator', label: 'elGoalMet', sub: 'elGoalMetSub' },
};

// Each view has a wide layout (desktop) and a narrow one (phones), naming the
// same nodes. Node geometry is [x, y, width, height] in the layout's own
// coordinates. Edges route orthogonally (render-architecture.mjs); `route:
// 'tree'` leaves from the source's centre, and `labelAt` puts the label's
// baseline centre at a fixed point.
const column = (ids, x, y, w, h, step) => Object.fromEntries(ids.map((id, i) => [id, [x, y + i * step, w, h]]));
const row = (ids, x, y, w, h, step) => Object.fromEntries(ids.map((id, i) => [id, [x + i * step, y, w, h]]));
const chain = (ids) => ids.slice(1).map((id, i) => ({ from: ids[i], to: id }));
const shipping = ['push', 'ci', 'ghcr', 'pinPr', 'deploy'];
const agentsStart = ['runPlan', 'planReview', 'goalSet', 'stepChange', 'stepCheck', 'stepBrowser'];
const agentsFinish = ['planDiff', 'simplify', 'codeReview', 'gate', 'retro', 'goalMet', 'push'];

// `page` is the built page a view is drawn on: architecture (/architecture/)
// or agents (/agents/).
export const views = [
  {
    id: 'estate',
    page: 'architecture',
    title: 'viewEstateTitle',
    desc: 'viewEstateDesc',
    focus: 'cloudflare',
    layouts: {
      wide: {
        width: 1192,
        height: 400,
        nodes: {
          people: [0, 40, 184, 320],
          host: [488, 0, 432, 400],
          outside: [1016, 0, 176, 400],
          household: [16, 80, 152, 80],
          visitors: [16, 172, 152, 80],
          guests: [16, 264, 152, 80],
          cloudflare: [264, 152, 144, 96],
          edge: [504, 48, 192, 72],
          runtime: [712, 48, 192, 72],
          family: [504, 136, 192, 72],
          observability: [712, 136, 192, 72],
          backup: [504, 224, 192, 72],
          runner: [712, 224, 192, 72],
          house: [504, 312, 400, 72],
          github: [1024, 40, 160, 72],
          r2: [1024, 128, 160, 72],
          telegram: [1024, 216, 160, 72],
          aiApis: [1024, 304, 160, 72],
        },
        edges: [
          { from: 'people', to: 'cloudflare', label: 'relHttps' },
          { from: 'cloudflare', to: 'host', label: 'relTunnel' },
          { from: 'github', to: 'host', label: 'relImages' },
          { from: 'host', to: 'r2', label: 'relBackups' },
          { from: 'host', to: 'telegram', label: 'relAlerts' },
          { from: 'host', to: 'aiApis', label: 'relAiCalls' },
        ],
      },
      narrow: {
        width: 342,
        height: 1294,
        nodes: {
          people: [0, 0, 342, 236],
          ...column(['household', 'visitors', 'guests'], 12, 36, 318, 56, 66),
          cloudflare: [0, 300, 342, 64],
          host: [0, 428, 342, 500],
          ...column(['edge', 'runtime', 'family', 'observability', 'backup', 'runner', 'house'], 12, 464, 318, 56, 66),
          outside: [0, 992, 342, 302],
          ...column(['github', 'r2', 'telegram', 'aiApis'], 12, 1028, 318, 56, 66),
        },
        edges: [
          { from: 'people', to: 'cloudflare', label: 'relHttps' },
          { from: 'cloudflare', to: 'host', label: 'relTunnel' },
          { from: 'host', to: 'outside', label: 'relHostOutside' },
        ],
      },
    },
  },
  {
    id: 'shipping',
    page: 'architecture',
    title: 'viewShippingTitle',
    desc: 'viewShippingDesc',
    focus: 'deploy',
    layouts: {
      wide: {
        width: 1152,
        height: 132,
        nodes: {
          fromPush: [0, 0, 1152, 132],
          ...row(shipping, 0, 44, 192, 88, 240),
        },
        edges: chain(shipping),
      },
      narrow: {
        width: 342,
        height: 532,
        nodes: {
          fromPush: [0, 0, 342, 532],
          ...column(shipping, 12, 36, 318, 64, 104),
        },
        edges: chain(shipping),
      },
    },
  },
  {
    id: 'agents',
    page: 'agents',
    title: 'viewAgentsTitle',
    desc: 'viewAgentsDesc',
    focus: 'planDiff',
    layouts: {
      wide: {
        width: 1164,
        height: 344,
        nodes: {
          stepLoop: [576, 0, 584, 152],
          afterSteps: [0, 200, 1164, 144],
          ...row(agentsStart, 0, 40, 168, 100, 196),
          ...row(agentsFinish, 0, 244, 156, 100, 168),
        },
        edges: [
          ...chain(agentsStart),
          { from: 'stepBrowser', to: 'planDiff', route: 'tree', label: 'relStepsDone', labelAt: [582, 184] },
          ...chain(agentsFinish),
        ],
      },
      narrow: {
        width: 342,
        height: 1424,
        nodes: {
          ...column(agentsStart.slice(0, 3), 12, 0, 318, 64, 104),
          stepLoop: [0, 312, 342, 324],
          ...column(agentsStart.slice(3), 12, 348, 318, 64, 104),
          afterSteps: [0, 684, 342, 740],
          ...column(agentsFinish, 12, 720, 318, 64, 104),
        },
        edges: [
          ...chain(agentsStart),
          { from: 'stepBrowser', to: 'planDiff', label: 'relStepsDone' },
          ...chain(agentsFinish),
        ],
      },
    },
  },
];

// The building-block rows under the estate diagram, in reading order.
export const blockCards = [
  { group: 'groupProducts', ids: ['khe-study', 'khe-ai-adventure', 'khe-trips', 'khe-sites', 'khe-ui'] },
  { group: 'groupPlatform', repo: 'khe-homelab', ids: ['edge', 'runtime', 'family', 'observability', 'backup', 'runner'] },
  { group: 'groupHouse', ids: ['house', 'khe-home-assistant'] },
  { group: 'groupMeta', ids: ['khe-workspace', 'khe-architecture', 'khe-meta', 'khelias', 'ha-estfeed'] },
];

// The five decisions section: each names its ADRs and a copy-key prefix
// (`<key>Title`, `<key>Buys`, `<key>Costs`).
export const keyDecisions = [
  { ids: ['011'], key: 'kd011' },
  { ids: ['010'], key: 'kd010' },
  { ids: ['008'], key: 'kd008' },
  { ids: ['001', '014'], key: 'kd001' },
  { ids: ['006'], key: 'kd006' },
];

// Product repos keep their own decisions; the page links the directories.
export const productDecisionDirs = [
  { repo: 'khe-study', url: 'https://github.com/khelias/khe-study/tree/main/docs/adr' },
  { repo: 'khe-ai-adventure', url: 'https://github.com/khelias/khe-ai-adventure/tree/main/docs/decisions' },
];
