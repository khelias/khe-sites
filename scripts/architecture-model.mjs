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
  agentVm: { kind: 'platform', label: 'elAgentVm', sub: 'elAgentVmSub' },
  github: { kind: 'external', label: 'elGithub', sub: 'elGithubSub' },
  r2: { kind: 'external', label: 'elR2', sub: 'elR2Sub' },
  telegram: { kind: 'external', label: 'elTelegram', sub: 'elTelegramSub' },
  aiApis: { kind: 'external', label: 'elAiApis', sub: 'elAiApisSub' },

  'khe-study': { kind: 'product', name: 'khe-study', repo: 'khe-study' },
  'khe-ai-adventure': { kind: 'product', name: 'khe-ai-adventure', repo: 'khe-ai-adventure' },
  'khe-trips': { kind: 'product', name: 'khe-trips', repo: 'khe-trips' },
  'khe-albums': { kind: 'product', name: 'khe-albums', repo: 'khe-albums' },
  'khe-bunny-tales': { kind: 'product', name: 'khe-bunny-tales', repo: 'khe-bunny-tales' },
  'khe-stories': { kind: 'product', name: 'khe-stories', repo: 'khe-stories' },
  'khe-deals': { kind: 'product', name: 'khe-deals', repo: 'khe-deals' },
  'khe-deals-watches': { kind: 'repo', name: 'khe-deals-watches', repo: 'khe-deals-watches' },
  'khe-sites': { kind: 'product', name: 'khe-sites', repo: 'khe-sites' },
  'khe-ui': { kind: 'repo', name: 'khe-ui', repo: 'khe-ui' },
  'khe-workspace': { kind: 'repo', name: 'khe-workspace', repo: 'khe-workspace' },
  'khe-architecture': { kind: 'repo', name: 'khe-architecture', repo: 'khe-architecture' },
  'khe-meta': { kind: 'repo', name: 'khe-meta', repo: 'khe-meta' },
  khelias: { kind: 'repo', name: 'khelias', repo: 'khelias' },
  'ha-estfeed': { kind: 'repo', name: 'ha-estfeed', repo: 'ha-estfeed' },
  'khe-home-assistant': { kind: 'repo', name: 'khe-home-assistant', repo: 'khe-home-assistant' },
  'khe-workshop': { kind: 'repo', name: 'khe-workshop', repo: 'khe-workshop' },

  fromPush: { kind: 'boundary', label: 'groupFromPush', style: 'rule' },
  push: { kind: 'step', owner: 'agent', tag: 'tagAgent', label: 'elPush', sub: 'elPushSub' },
  ci: { kind: 'step', owner: 'machine', tag: 'tagCi', label: 'elCi', sub: 'elCiSub' },
  ghcr: { kind: 'step', owner: 'machine', tag: 'tagRegistry', label: 'elGhcr', sub: 'elGhcrSub' },
  pinPr: { kind: 'step', owner: 'machine', tag: 'tagHomelab', label: 'elPinPr', sub: 'elPinPrSub' },
  deploy: { kind: 'step', owner: 'machine', tag: 'tagVm', label: 'elDeploy', sub: 'elDeploySub' },
};

// Each view has a wide layout (desktop) and a narrow one (phones), naming the
// same nodes. Node geometry is [x, y, width, height] in the layout's own
// coordinates. Edges route orthogonally (render-architecture.mjs).
const column = (ids, x, y, w, h, step) => Object.fromEntries(ids.map((id, i) => [id, [x, y + i * step, w, h]]));
const row = (ids, x, y, w, h, step) => Object.fromEntries(ids.map((id, i) => [id, [x + i * step, y, w, h]]));
const chain = (ids) => ids.slice(1).map((id, i) => ({ from: ids[i], to: id }));
const shipping = ['push', 'ci', 'ghcr', 'pinPr', 'deploy'];

// `page` is the built page a view is drawn on, one of ARCHITECTURE_PAGES in
// render-architecture.mjs.
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
          house: [504, 312, 192, 72],
          agentVm: [712, 312, 192, 72],
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
        height: 1360,
        nodes: {
          people: [0, 0, 342, 236],
          ...column(['household', 'visitors', 'guests'], 12, 36, 318, 56, 66),
          cloudflare: [0, 300, 342, 64],
          host: [0, 428, 342, 566],
          ...column(['edge', 'runtime', 'family', 'observability', 'backup', 'runner', 'house', 'agentVm'], 12, 464, 318, 56, 66),
          outside: [0, 1058, 342, 302],
          ...column(['github', 'r2', 'telegram', 'aiApis'], 12, 1094, 318, 56, 66),
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
];

// The building-block rows under the estate diagram, in reading order.
export const blockCards = [
  { group: 'groupProducts', ids: ['khe-study', 'khe-ai-adventure', 'khe-trips', 'khe-albums', 'khe-bunny-tales', 'khe-stories', 'khe-deals', 'khe-deals-watches', 'khe-sites', 'khe-ui'] },
  { group: 'groupPlatform', repo: 'khe-homelab', ids: ['edge', 'runtime', 'family', 'observability', 'backup', 'runner', 'agentVm'] },
  { group: 'groupHouse', ids: ['house', 'khe-home-assistant', 'khe-workshop'] },
  { group: 'groupMeta', ids: ['khe-workspace', 'khe-architecture', 'khe-meta', 'khelias', 'ha-estfeed'] },
];

// The five decisions section: each names its ADRs and a copy-key prefix
// (`<key>Title`, `<key>Buys`, `<key>Costs`).
export const keyDecisions = [
  { ids: ['022'], key: 'kd022' },
  { ids: ['010'], key: 'kd010' },
  { ids: ['008'], key: 'kd008' },
  { ids: ['001', '014'], key: 'kd001' },
  { ids: ['023'], key: 'kd023' },
];

// The public repos that keep their own decisions; the page links the directories.
export const repoDecisionDirs = [
  { repo: 'khe-study', url: 'https://github.com/khelias/khe-study/tree/main/docs/adr' },
  { repo: 'khe-ai-adventure', url: 'https://github.com/khelias/khe-ai-adventure/tree/main/docs/decisions' },
  { repo: 'khe-stories', url: 'https://github.com/khelias/khe-stories/tree/main/docs/decisions' },
  { repo: 'khe-deals', url: 'https://github.com/khelias/khe-deals/tree/main/docs/decisions' },
  { repo: 'khe-ui', url: 'https://github.com/khelias/khe-ui/tree/main/docs/adr' },
  { repo: 'khe-sites', url: 'https://github.com/khelias/khe-sites/tree/main/docs/decisions' },
];
