import { createLocaleController } from '/assets/site-locale.js';

const COPY = {
  en: {
    title: 'KHE Lab Atlas',
    description: 'Interactive map of the KHE homelab ingress, deploy path, security boundaries, and recovery layers',
    homeLabel: 'KHE home',
    languageLabel: 'Language',
    statusLabel: 'Lab highlights',
    modeLabel: 'Atlas mode',
    mapLabel: 'Interactive route map',
    kicker: 'Public systems atlas',
    headline: 'KHE Lab Atlas',
    subtitle: 'An interactive map of the homelab paths that matter: public ingress, private access, deploy, trust boundaries, and recovery.',
    metricPorts: 'open router ports',
    metricServices: 'services',
    metricContainers: 'containers',
    metricLayers: 'recovery layers',
    selectedLabel: 'Selected node',
    laneLabel: 'Active route',
    factsLabel: 'Technical facts',
    plainLabel: 'Plain version',
    proofLabel: 'What it proves',
    playRoute: 'Play route',
    stopRoute: 'Stop',
    snapshotLoading: 'Loading repo snapshot',
    snapshotFallback: 'Repo snapshot unavailable',
    snapshotGenerated: (data) => `Repo snapshot: ${data.source.composeFiles} compose files`,
    homeHref: '/?lang=en',
  },
  et: {
    title: 'KHE Lab Atlas',
    description: 'Interaktiivne kaart KHE kodulabori ligipääsust, deploy teest, turvapiiridest ja taastest',
    homeLabel: 'KHE avaleht',
    languageLabel: 'Keel',
    statusLabel: 'Labori põhinäitajad',
    modeLabel: 'Atlase režiim',
    mapLabel: 'Interaktiivne teekonnakaart',
    kicker: 'Avalik süsteemiatlas',
    headline: 'KHE Lab Atlas',
    subtitle: 'Interaktiivne kaart homelabi olulistest teedest: avalik ligipääs, privaatne ligipääs, deploy, usalduspiirid ja taaste.',
    metricPorts: 'avatud ruuteripordi',
    metricServices: 'teenust',
    metricContainers: 'containerit',
    metricLayers: 'taastekihti',
    selectedLabel: 'Valitud sõlm',
    laneLabel: 'Aktiivne rada',
    factsLabel: 'Tehnilised faktid',
    plainLabel: 'Lihtne seletus',
    proofLabel: 'Mida see tõestab',
    playRoute: 'Mängi rada',
    stopRoute: 'Peata',
    snapshotLoading: 'Loen repo snapshoti',
    snapshotFallback: 'Repo snapshot pole saadaval',
    snapshotGenerated: (data) => `Repo snapshot: ${data.source.composeFiles} compose faili`,
    homeHref: '/?lang=et',
  },
};

const STEPS = {
  visitor: {
    icon: '01',
    copy: {
      en: ['Visitor', 'Public entry', 'This is a normal person opening the public site or games page.', ['Public-only surface', 'No admin links', 'Static app first']],
      et: ['Külastaja', 'Avalik sisenemine', 'See on inimene, kes avab avaliku saidi või mängude lehe.', ['Ainult avalik pind', 'Admin-liideseid pole', 'Staatiline sait esimesena']],
    },
  },
  cloudflare: {
    icon: 'CF',
    copy: {
      en: ['Cloudflare edge', 'External front door', 'Cloudflare acts like the public front desk before traffic reaches home.', ['TLS at the edge', 'Access OTP for tools', 'No router NAT']],
      et: ['Cloudflare edge', 'Väline uks', 'Cloudflare on avalik vastuvõtukiht enne, kui liiklus koju jõuab.', ['TLS Cloudflare’is', 'OTP kaitstud tööriistad', 'Ruuteri NAT puudub']],
    },
  },
  tunnel: {
    icon: 'TN',
    copy: {
      en: ['Cloudflare Tunnel', 'Outbound ingress', 'The server calls out to Cloudflare, instead of strangers connecting directly into the house.', ['Outbound tunnel', 'Selected hostnames', 'Small public surface']],
      et: ['Cloudflare Tunnel', 'Väljuv ingress', 'Server ühendub ise Cloudflare poole, mitte võõrad ei tule otse koju sisse.', ['Väljuv tunnel', 'Valitud domeenid', 'Väike avalik pind']],
    },
  },
  docker: {
    icon: 'VM',
    copy: {
      en: ['Docker VM', 'Runtime core', 'This is the main machine where the home services actually run.', ['17 services', '27 containers', 'Compose-managed']],
      et: ['Docker VM', 'Runtime tuum', 'See on masin, kus homelabi teenused päriselt jooksevad.', ['17 teenust', '27 konteinerit', 'Compose haldus']],
    },
  },
  publicApps: {
    icon: 'APP',
    copy: {
      en: ['Public apps', 'Product surface', 'These are the parts other people can safely open and use.', ['khe.ee', 'games.khe.ee', 'Static deployment']],
      et: ['Avalikud äpid', 'Toote pind', 'Need on osad, mida teised inimesed saavad avada ja kasutada ilma admin-pinda nägemata.', ['khe.ee', 'games.khe.ee', 'Staatiline deploy']],
    },
  },
  device: {
    icon: 'LAN',
    copy: {
      en: ['Trusted device', 'Private user', 'Your own laptop or phone gets a private route that visitors never see.', ['Home network', 'Mobile via VPN', 'No public admin']],
      et: ['Usaldatud seade', 'Privaatne kasutaja', 'Sinu enda läppar või telefon saab privaatse tee, mida külastajad ei näe.', ['Koduvõrk', 'Mobiil VPN-iga', 'Avalikku adminit pole']],
    },
  },
  tailscale: {
    icon: 'TS',
    copy: {
      en: ['Tailscale', 'Private access', 'This creates a private lane back home when you are away.', ['Subnet router', 'Admin path', 'Bypasses upload limits']],
      et: ['Tailscale', 'Privaatne ligipääs', 'See loob privaatse raja koju tagasi, kui oled eemal.', ['LAN subnet-router', 'Admini tee', 'Väldib upload piiranguid']],
    },
  },
  adguard: {
    icon: 'DNS',
    copy: {
      en: ['AdGuard DNS', 'Split-horizon DNS', 'Local domains resolve to LAN routes instead of bouncing through the public edge.', ['LAN rewrites', 'Single DNS path', 'Filtering follows devices']],
      et: ['AdGuard DNS', 'Split-horizon DNS', 'Kohalikud domeenid lahenevad LAN teele, mitte avaliku edge’i kaudu tagasi.', ['LAN DNS-ümberkirjutused', 'Üks DNS tee', 'Filter liigub seadmetega']],
    },
  },
  npm: {
    icon: 'TLS',
    copy: {
      en: ['Nginx Proxy Manager', 'LAN TLS proxy', 'A wildcard certificate gives home services clean HTTPS on private routes.', ['Wildcard TLS', 'LAN-only admin', 'No upload cap']],
      et: ['Nginx Proxy Manager', 'LAN TLS proxy', 'Wildcard-sertifikaat annab koduteenustele privaatteedel puhta HTTPS-i.', ['Wildcard TLS', 'LAN-only admin', 'Upload cap puudub']],
    },
  },
  commit: {
    icon: 'GIT',
    copy: {
      en: ['Commit', 'Source change', 'A site change starts as a tracked code change, not as manual server tinkering.', ['Git history', 'Reviewable diff', 'Rollback source']],
      et: ['Commit', 'Koodimuudatus', 'Saidi muudatus algab jälgitava koodimuudatusena, mitte serveris käsitsi nokitsemisena.', ['Git history', 'Ülevaadatav diff', 'Rollback allikas']],
    },
  },
  actions: {
    icon: 'CI',
    copy: {
      en: ['GitHub Actions', 'CI pipeline', 'Build and checks run before deploy, so the public surface is not a manual copy.', ['Automated checks', 'Build artifact', 'Repeatable path']],
      et: ['GitHub Actions', 'CI pipeline', 'Build ja kontrollid jooksevad enne deploy’d, seega avalik pind ei ole käsitsi copy.', ['Automaatkontrollid', 'Build artefakt', 'Korratav tee']],
    },
  },
  runner: {
    icon: 'RUN',
    copy: {
      en: ['Self-hosted runner', 'Deploy worker', 'This worker receives the finished build and places it where the site is served.', ['Runs in homelab', 'Repo-scoped', 'No manual upload']],
      et: ['Self-hosted runner', 'Deploy worker', 'See worker võtab valmis buildi ja paneb selle kohta, kust saiti serveeritakse.', ['Jookseb homelabis', 'Repo-scoped', 'Käsitsi uploadi pole']],
    },
  },
  servedDirs: {
    icon: 'WWW',
    copy: {
      en: ['Served directories', 'Static root', 'Built files land in served directories instead of requiring an app server for everything.', ['Static assets', 'Simple rollback shape', 'Small runtime']],
      et: ['Serve directory’d', 'Static root', 'Buildi failid lähevad serveeritavatesse kataloogidesse, mitte igale asjale app serverisse.', ['Static assetid', 'Lihtne rollback kuju', 'Väike runtime']],
    },
  },
  checks: {
    icon: 'CHK',
    copy: {
      en: ['Static checks', 'Guardrail', 'The route proves that UI, copy, and links are valid before publishing.', ['HTML markers', 'Locale hooks', 'No inline CSS drift']],
      et: ['Staatilised kontrollid', 'Guardrail', 'Tee tõestab, et UI, copy ja lingid on enne avaldamist korras.', ['HTML markerid', 'Locale hookid', 'Inline CSS puudub']],
    },
  },
  build: {
    icon: 'BLD',
    copy: {
      en: ['Build', 'Artifact creation', 'The same build output can be previewed locally and published to production.', ['dist/landing', 'dist/games', 'Font assets copied']],
      et: ['Build', 'Artefakti loomine', 'Sama build outputi saab lokaalselt eelvaadata ja productionisse avaldada.', ['dist/landing', 'dist/games', 'Font assetid kopeeritud']],
    },
  },
  smoke: {
    icon: 'E2E',
    copy: {
      en: ['Smoke test', 'User-visible check', 'The strongest version verifies the public path in a browser after deploy.', ['Browser load', 'Console clean', 'Responsive check']],
      et: ['Smoke test', 'Kasutajale nähtav kontroll', 'Tugevaim versioon kontrollib pärast deploy’d avaliku tee brauseris üle.', ['Brauseris laadimine', 'Konsool puhas', 'Responsive check']],
    },
  },
  releaseNote: {
    icon: 'LOG',
    copy: {
      en: ['Release note', 'Human context', 'A tiny release trail makes the site feel alive without exposing internal dashboards.', ['Last deploy', 'Last check', 'Public-safe metadata']],
      et: ['Release jälg', 'Inimlik kontekst', 'Väike release trail teeb saidi elusaks ilma sisemisi dashboarde avamata.', ['Viimane deploy', 'Viimane kontroll', 'Avalik metadata']],
    },
  },
  closedRouter: {
    icon: '0',
    copy: {
      en: ['Closed router', 'Zero inbound ports', 'The strongest security story is that the home router is not the public interface.', ['0 open ports', 'Tunnel ingress', 'No WAN NAT']],
      et: ['Suletud ruuter', 'Null sissetulevat porti', 'Tugevaim turvalugu on see, et koduruuter ei ole avalik liides.', ['0 avatud porti', 'Tunnel ingress', 'WAN NAT puudub']],
    },
  },
  cloudflareAccess: {
    icon: 'OTP',
    copy: {
      en: ['Cloudflare Access', 'Sensitive gate', 'Dashboards and ops tools sit behind identity checks before reaching the tunnel.', ['Email OTP', 'Tool-only gate', 'Public apps stay simple']],
      et: ['Cloudflare Access', 'Tundlik värav', 'Dashboardid ja ops tööriistad on enne tunnelit identiteedikontrolli taga.', ['Email OTP + allowlist', 'Ainult tööriistade gate', 'Avalikud äpid jäävad lihtsaks']],
    },
  },
  openclaw: {
    icon: 'AI',
    copy: {
      en: ['OpenClaw', 'AI ops workspace', 'A protected agent workspace exists, but the public atlas describes it without exposing controls.', ['Access protected', 'Operational context', 'No public control plane']],
      et: ['OpenClaw', 'AI ops workspace', 'Kaitstud agent workspace eksisteerib, aga avalik atlas kirjeldab seda ilma juhtpaneele avamata.', ['Ligipääs kaitstud', 'Operatiivne kontekst', 'Avalikku control plane’i pole']],
    },
  },
  socketProxy: {
    icon: 'SOX',
    copy: {
      en: ['Docker socket proxy', 'Narrow capability', 'Tools that need Docker visibility receive scoped access, not the raw socket.', ['Read-limited pattern', 'Restart only where needed', 'No broad exec/create']],
      et: ['Docker socket proxy', 'Kitsas võimekus', 'Dockerit vajavad tööriistad saavad piiratud ligipääsu, mitte raw socketit.', ['Read-limited pattern', 'Restart ainult vajadusel', 'Lai exec/create puudub']],
    },
  },
  noSecrets: {
    icon: 'ENV',
    copy: {
      en: ['Secrets boundary', 'Repo hygiene', 'The public showcase can be generated only from sanitized metadata.', ['No .env values', 'No tokens', 'No admin URLs']],
      et: ['Saladuste piir', 'Repo hügieen', 'Avalik showcase tuleb ainult sanitiseeritud metadatast.', ['.env väärtusi pole', 'Tokeneid pole', 'Admin URL-e pole']],
    },
  },
  healthcheck: {
    icon: 'HC',
    copy: {
      en: ['Healthchecks', 'Local signal', 'Containers publish health so recovery can start before humans notice symptoms.', ['Service-level signal', 'Autoheal input', 'Standardization target']],
      et: ['Healthcheckid', 'Kohalik signaal', 'Healthcheckiga konteinerid annavad seisust märku, et taastumine algaks enne kui inimene sümptomeid märkab.', ['Teenusepõhine signaal', 'Autoheali sisend', 'Standardiseerimise siht']],
    },
  },
  uptime: {
    icon: 'UP',
    copy: {
      en: ['Uptime Kuma', 'Alert layer', 'Service monitors turn outages into phone-visible alerts quickly.', ['HTTP/DNS monitors', 'Telegram alerts', 'Config backed up']],
      et: ['Uptime Kuma', 'Alert kiht', 'Teenusemonitorid muudavad katkestused kiiresti telefonis nähtavaks alertiks.', ['HTTP/DNS monitorid', 'Telegram alertid', 'Config backupitud']],
    },
  },
  uptimeRobot: {
    icon: 'EXT',
    copy: {
      en: ['UptimeRobot', 'External monitor', 'An outside monitor can still alert when the whole homelab or home internet is unreachable.', ['5 minute ping', 'iOS push', 'Outside the LAN']],
      et: ['UptimeRobot', 'Väline monitor', 'Väline monitor saab hoiatada ka siis, kui terve homelab või koduinternet on maas.', ['5 min ping', 'iOS push', 'Väljaspool LAN-i']],
    },
  },
  autoheal: {
    icon: 'AH',
    copy: {
      en: ['Autoheal', 'Container restart', 'Unhealthy containers are restarted without waiting for a full crash.', ['Docker health state', 'Socket proxy path', 'Covers stuck workers']],
      et: ['Autoheal', 'Konteineri restart', 'Unhealthy konteinerid restarditakse ilma täielikku crashi ootamata.', ['Docker health state', 'Socket proxy tee', 'Katab kinni jäänud workerid']],
    },
  },
  watchdog: {
    icon: 'WD',
    copy: {
      en: ['Hardware watchdog', 'VM recovery', 'When the kernel wedges and containers cannot report anything, the watchdog is the last local layer.', ['30s timeout', 'Hypervisor reset', 'Kernel hang class']],
      et: ['Hardware watchdog', 'VM taastumine', 'Kui kernel hangib ja konteinerid ei saa midagi raporteerida, on watchdog viimane kohalik kiht.', ['30s timeout', 'Hypervisor reset', 'Kernel hang klass']],
    },
  },
  postgresDump: {
    icon: 'DB',
    copy: {
      en: ['Postgres dumps', 'Database backup', 'Stateful services need recoverable database snapshots, not just container restarts.', ['Service DBs', 'Scheduled backup', 'Restore test target']],
      et: ['Postgres dumpid', 'Andmebaasi backup', 'Stateful teenused vajavad taastatavaid DB snapshote, mitte ainult konteineri restarti.', ['Teenuste DB-d', 'Ajastatud backup', 'Restore testi siht']],
    },
  },
  configSnapshot: {
    icon: 'CFG',
    copy: {
      en: ['Config snapshots', 'Service memory', 'Configs and monitor definitions are part of recovery, not decoration.', ['Compose files', 'Kuma config', 'Homepage config']],
      et: ['Config snapshotid', 'Teenuse mälu', 'Configud ja monitori definitsioonid on taastumise osa, mitte dekoratsioon.', ['Compose failid', 'Kuma config', 'Homepage config']],
    },
  },
  zfs: {
    icon: 'ZFS',
    copy: {
      en: ['ZFS mirror', 'Local storage', 'Bulk data and backups live on mirrored disks behind the Docker VM.', ['2 x 12TB mirror', 'NFS mount', 'Bulk media and docs']],
      et: ['ZFS mirror', 'Kohalik salvestus', 'Bulk data ja backupid elavad Docker VM-i taga mirroritud ketastel.', ['2 x 12TB mirror', 'NFS mount', 'Media ja dokumendid']],
    },
  },
  offsiteNext: {
    icon: 'B2',
    copy: {
      en: ['Offsite backup', 'Cloudflare R2 tier', 'Restic ships local backup payloads to Cloudflare R2 so recovery is not tied to the local ZFS pool.', ['restic to R2', 'AES-256 + retention', 'Restore runbook']],
      et: ['Offsite backup', 'Cloudflare R2 kiht', 'Restic saadab kohalikud backupid Cloudflare R2-sse, et taaste ei sõltuks ainult kohalikust ZFS poolist.', ['restic -> R2', 'AES-256 + retention', 'Restore runbook']],
    },
  },
};

const MODES = [
  {
    id: 'network',
    code: 'NET',
    accent: 'cyan',
    copy: {
      en: {
        title: 'Network without open ports',
        summary: 'Two clean routes explain how the public edge and private LAN path reach the same runtime core.',
        kicker: 'Signal path',
      },
      et: {
        title: 'Võrk ilma avatud portideta',
        summary: 'Kaks puhast rada näitavad, kuidas avalik edge ja privaatne LAN tee jõuavad sama runtime tuumani.',
        kicker: 'Signaali tee',
      },
    },
    lanes: [
      {
        id: 'public',
        copy: {
          en: ['Public request path', 'Internet traffic reaches only the public product surface.'],
          et: ['Avalik päringu tee', 'Internetiliiklus jõuab ainult avaliku toote pinnani.'],
        },
        nodes: [
          ['visitor', 92, 205],
          ['cloudflare', 270, 140],
          ['tunnel', 462, 245],
          ['docker', 642, 300],
          ['publicApps', 850, 180],
        ],
      },
      {
        id: 'private',
        copy: {
          en: ['Private LAN path', 'Admin and home devices stay on private routes.'],
          et: ['Privaatne LAN tee', 'Admin ja koduseadmed jäävad privaatsetele teedele.'],
        },
        nodes: [
          ['device', 92, 470],
          ['tailscale', 276, 510],
          ['adguard', 470, 430],
          ['npm', 645, 430],
          ['docker', 642, 300],
        ],
      },
    ],
  },
  {
    id: 'deploy',
    code: 'DEP',
    accent: 'amber',
    copy: {
      en: {
        title: 'Commit to public site',
        summary: 'The release map shows how code becomes a public app without a manual upload step.',
        kicker: 'Release path',
      },
      et: {
        title: 'Commitist avaliku saidini',
        summary: 'Release kaart näitab, kuidas kood muutub avalikuks äpiks ilma käsitsi uploadita.',
        kicker: 'Release tee',
      },
    },
    lanes: [
      {
        id: 'release',
        copy: {
          en: ['Release path', 'The app stack moves from Git to the homelab-served static roots.'],
          et: ['Release tee', 'App stack liigub Gitist homelabis serveeritavatesse static rootidesse.'],
        },
        nodes: [
          ['commit', 92, 180],
          ['actions', 282, 180],
          ['runner', 475, 300],
          ['servedDirs', 670, 300],
          ['publicApps', 860, 180],
        ],
      },
      {
        id: 'quality',
        copy: {
          en: ['Quality path', 'Checks and browser smoke make the public showcase credible.'],
          et: ['Quality tee', 'Kontrollid ja browser smoke teevad avaliku showcase’i usutavaks.'],
        },
        nodes: [
          ['checks', 185, 475],
          ['build', 380, 475],
          ['smoke', 575, 475],
          ['releaseNote', 770, 475],
        ],
      },
    ],
  },
  {
    id: 'security',
    code: 'SEC',
    accent: 'red',
    copy: {
      en: {
        title: 'Trust boundary map',
        summary: 'The security view explains the defensive shape without exposing controls, secrets, or admin dashboards.',
        kicker: 'Trust boundary',
      },
      et: {
        title: 'Usalduspiiride kaart',
        summary: 'Turvavaade selgitab kaitsekuju ilma juhtpaneele, saladusi või admin dashboarde avamata.',
        kicker: 'Usalduspiir',
      },
    },
    lanes: [
      {
        id: 'external',
        copy: {
          en: ['External boundary', 'The public route is intentionally narrow.'],
          et: ['Väline piir', 'Avalik tee on meelega kitsas.'],
        },
        nodes: [
          ['closedRouter', 108, 320],
          ['cloudflareAccess', 305, 165],
          ['tunnel', 505, 165],
          ['publicApps', 812, 165],
        ],
      },
      {
        id: 'ops',
        copy: {
          en: ['Ops boundary', 'Operational tools stay behind private and scoped paths.'],
          et: ['Ops piir', 'Operatiivsed tööriistad jäävad privaatsete ja piiratud teede taha.'],
        },
        nodes: [
          ['tailscale', 130, 500],
          ['openclaw', 360, 500],
          ['socketProxy', 595, 500],
          ['noSecrets', 820, 500],
        ],
      },
    ],
  },
  {
    id: 'recovery',
    code: 'REC',
    accent: 'green',
    copy: {
      en: {
        title: 'Recovery by failure class',
        summary: 'Each layer catches a different failure, from a stuck container to a whole VM hang.',
        kicker: 'Failure path',
      },
      et: {
        title: 'Taaste tõrkeklassi järgi',
        summary: 'Iga kiht püüab eri tõrke, kinni jäänud konteinerist kuni terve VM-i hangini.',
        kicker: 'Tõrke tee',
      },
    },
    lanes: [
      {
        id: 'runtime',
        copy: {
          en: ['Runtime recovery', 'Runtime failures recover close to the failure source.'],
          et: ['Runtime taaste', 'Runtime tõrked taastuvad tõrke allika lähedal.'],
        },
        nodes: [
          ['healthcheck', 105, 215],
          ['autoheal', 285, 215],
          ['uptime', 470, 305],
          ['watchdog', 650, 215],
          ['uptimeRobot', 830, 215],
        ],
      },
      {
        id: 'data',
        copy: {
          en: ['Data recovery', 'Stateful services need a path beyond restart logic.'],
          et: ['Andmete taaste', 'Stateful teenused vajavad rohkemat kui restart-loogikat.'],
        },
        nodes: [
          ['postgresDump', 135, 500],
          ['configSnapshot', 360, 500],
          ['zfs', 585, 500],
          ['offsiteNext', 810, 500],
        ],
      },
    ],
  },
];

let activeModeId = 'network';
let activeLaneId = 'public';
let selectedStepId = 'docker';
let labData = null;
let isPlaying = false;
let playbackTimer = null;
let playbackIndex = 0;

const modeById = new Map(MODES.map((mode) => [mode.id, mode]));

const localeController = createLocaleController({
  copy: COPY,
  defaultLocale: 'en',
  links: {
    home: (locale) => `/?lang=${locale}`,
  },
});

function locale() {
  return document.documentElement.lang === 'et' ? 'et' : 'en';
}

function activeMode() {
  return modeById.get(activeModeId);
}

function modeText(mode = activeMode()) {
  return mode.copy[locale()];
}

function stepText(stepId) {
  return STEPS[stepId].copy[locale()];
}

function activeLane() {
  return activeMode().lanes.find((lane) => lane.id === activeLaneId) || activeMode().lanes[0];
}

function resetMapScroll() {
  const map = document.querySelector('.lab-cinematic-map');
  if (map) map.scrollLeft = 0;
}

function setMode(modeId) {
  stopPlayback();
  activeModeId = modeId;
  activeLaneId = activeMode().lanes[0].id;
  selectedStepId = activeLane().nodes[Math.min(2, activeLane().nodes.length - 1)][0];
  render();
  resetMapScroll();
}

function setLane(laneId) {
  stopPlayback();
  activeLaneId = laneId;
  selectedStepId = activeLane().nodes[Math.min(2, activeLane().nodes.length - 1)][0];
  render();
  resetMapScroll();
}

function selectNode(stepId, laneId, stopActivePlayback = true) {
  if (stopActivePlayback) stopPlayback();
  selectedStepId = stepId;
  activeLaneId = laneId;
  render();
}

function stopPlayback() {
  if (playbackTimer) window.clearTimeout(playbackTimer);
  playbackTimer = null;
  playbackIndex = 0;
  isPlaying = false;
  document.body.classList.remove('is-playing-route');
}

function startPlayback() {
  stopPlayback();
  isPlaying = true;
  document.body.classList.add('is-playing-route');
  const nodes = activeLane().nodes.map(([stepId]) => stepId);

  function tick() {
    selectedStepId = nodes[playbackIndex];
    render();
    playbackIndex += 1;
    if (playbackIndex >= nodes.length) {
      playbackTimer = window.setTimeout(() => {
        stopPlayback();
        render();
      }, 850);
      return;
    }
    playbackTimer = window.setTimeout(tick, 900);
  }

  tick();
}

function togglePlayback() {
  if (isPlaying) {
    stopPlayback();
    render();
  } else {
    startPlayback();
  }
}

function splitLabel(label) {
  const words = label.split(' ');
  if (words.length < 3 || label.length < 16) return [label];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
}

function linePath(nodes) {
  return nodes
    .map(([, x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ');
}

function renderModeRail() {
  const rail = document.querySelector('.lab-story-rail');
  rail.innerHTML = MODES.map((mode) => {
    const text = modeText(mode);
    const active = mode.id === activeModeId;
    return `
      <button type="button" class="lab-story-card" data-mode="${mode.id}" role="tab" aria-selected="${active}">
        <span>${mode.code}</span>
        <strong>${text.title}</strong>
        <small>${text.kicker}</small>
      </button>
    `;
  }).join('');

  rail.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => setMode(button.getAttribute('data-mode')));
  });
}

function renderMapCopy() {
  const mode = activeMode();
  const text = modeText(mode);
  document.body.dataset.accent = mode.accent;
  document.querySelector('[data-map-code]').textContent = mode.code;
  document.querySelector('[data-map-kicker]').textContent = text.kicker;
  document.querySelector('[data-map-title]').textContent = text.title;
  document.querySelector('[data-map-summary]').textContent = text.summary;
}

function renderMetrics() {
  if (!labData?.metrics) return;
  Object.entries(labData.metrics).forEach(([key, value]) => {
    const node = document.querySelector(`[data-lab-metric="${key}"]`);
    if (node) node.textContent = String(value);
  });
}

function renderSnapshotStatus() {
  const status = document.querySelector('[data-snapshot-status]');
  if (!status) return;
  status.textContent = labData
    ? COPY[locale()].snapshotGenerated(labData)
    : COPY[locale()].snapshotFallback;
}

function renderPlaybackControl() {
  const button = document.querySelector('[data-play-route]');
  if (!button) return;
  button.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
  button.querySelector('span').textContent = isPlaying
    ? COPY[locale()].stopRoute
    : COPY[locale()].playRoute;
  button.onclick = togglePlayback;
}

function renderLaneTabs() {
  const tabs = document.querySelector('[data-lane-tabs]');
  tabs.innerHTML = activeMode().lanes.map((lane) => {
    const [title, summary] = lane.copy[locale()];
    const active = lane.id === activeLaneId;
    return `
      <button type="button" class="lab-lane-tab" data-lane="${lane.id}" aria-pressed="${active}">
        <span>${COPY[locale()].laneLabel}</span>
        <strong>${title}</strong>
        <small>${summary}</small>
      </button>
    `;
  }).join('');

  tabs.querySelectorAll('[data-lane]').forEach((button) => {
    button.addEventListener('click', () => setLane(button.getAttribute('data-lane')));
  });
}

function renderSvgMap() {
  const svg = document.querySelector('[data-route-map]');
  const mode = activeMode();
  svg.innerHTML = `
    <defs>
      <pattern id="lab-grid" width="48" height="48" patternUnits="userSpaceOnUse">
        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.055)" stroke-width="1" />
      </pattern>
      <radialGradient id="lab-core-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="currentColor" stop-opacity="0.24" />
        <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
      </radialGradient>
      <filter id="lab-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect class="lab-svg-bg" x="0" y="0" width="1000" height="620"></rect>
    <rect class="lab-svg-grid" x="0" y="0" width="1000" height="620"></rect>
    <circle class="lab-svg-radar" cx="500" cy="310" r="250"></circle>
    <circle class="lab-svg-radar lab-svg-radar-outer" cx="500" cy="310" r="390"></circle>
    ${mode.lanes.map((lane) => {
      const active = lane.id === activeLaneId;
      return `
        <g class="lab-svg-lane ${active ? 'is-active' : 'is-idle'}" data-svg-lane="${lane.id}">
          <path class="lab-svg-path" d="${linePath(lane.nodes)}"></path>
          ${lane.nodes.map(([stepId, x, y]) => {
            const [label, role] = stepText(stepId);
            const selected = stepId === selectedStepId && lane.id === activeLaneId;
            const playing = selected && isPlaying;
            const labelLines = splitLabel(label);
            return `
              <g class="lab-svg-node ${selected ? 'is-selected' : ''} ${playing ? 'is-playing' : ''}" data-step="${stepId}" data-lane="${lane.id}" role="button" tabindex="0" aria-label="${label}">
                <circle class="lab-node-aura" cx="${x}" cy="${y}" r="56"></circle>
                <rect class="lab-node-plate" x="${x - 72}" y="${y - 43}" width="144" height="86" rx="10"></rect>
                <circle class="lab-node-dot" cx="${x - 46}" cy="${y - 16}" r="10"></circle>
                <text class="lab-node-icon" x="${x - 46}" y="${y - 12}">${STEPS[stepId].icon}</text>
                <text class="lab-node-title" x="${x - 22}" y="${y - 16}">
                  ${labelLines.map((line, index) => `<tspan x="${x - 22}" dy="${index === 0 ? 0 : 15}">${line}</tspan>`).join('')}
                </text>
                <text class="lab-node-role" x="${x - 22}" y="${y + 28}">${role}</text>
                <rect class="lab-node-hitbox" x="${x - 72}" y="${y - 43}" width="144" height="86" rx="10"></rect>
              </g>
            `;
          }).join('')}
        </g>
      `;
    }).join('')}
  `;

  svg.querySelectorAll('[data-step]').forEach((node) => {
    node.addEventListener('click', () => selectNode(node.getAttribute('data-step'), node.getAttribute('data-lane')));
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectNode(node.getAttribute('data-step'), node.getAttribute('data-lane'));
      }
    });
  });
}

function renderNodePanel() {
  const panel = document.querySelector('[data-node-panel]');
  const [title, role, summary, facts] = stepText(selectedStepId);
  const lane = activeLane();
  const [laneTitle, laneSummary] = lane.copy[locale()];
  const proof = facts[0] || role;
  panel.innerHTML = `
    <div class="lab-node-panel-head">
      <div class="lab-node-panel-icon">${STEPS[selectedStepId].icon}</div>
      <div>
        <div class="lab-node-panel-kicker">${COPY[locale()].selectedLabel}</div>
        <h2>${title}</h2>
        <p class="lab-node-panel-role">${role}</p>
      </div>
    </div>
    <p class="lab-node-panel-summary">${summary}</p>
    <div class="lab-node-panel-meta">
      <div>
        <span>${COPY[locale()].laneLabel}</span>
        <strong>${laneTitle}</strong>
        <p>${laneSummary}</p>
      </div>
      <div>
        <span>${COPY[locale()].proofLabel}</span>
        <strong>${proof}</strong>
      </div>
    </div>
    <div class="lab-node-panel-facts-group">
      <span>${COPY[locale()].factsLabel}</span>
      <ul class="lab-node-panel-facts">${facts.map((fact) => `<li>${fact}</li>`).join('')}</ul>
    </div>
  `;
}

function render() {
  renderMetrics();
  renderModeRail();
  renderMapCopy();
  renderSnapshotStatus();
  renderPlaybackControl();
  renderLaneTabs();
  renderSvgMap();
  renderNodePanel();
}

document.querySelectorAll('[data-lang-option]').forEach((button) => {
  button.addEventListener('click', () => {
    localeController.applyLocale(button.getAttribute('data-lang-option'));
    render();
  });
});

async function loadLabData() {
  try {
    const response = await fetch(new URL('lab-data.json', window.location.href), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Lab data request failed: ${response.status}`);
    labData = await response.json();
    render();
  } catch (error) {
    console.warn('Lab Atlas is using static fallback data.', error);
  }
}

render();
loadLabData();
