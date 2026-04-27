import { createLocaleController } from '/assets/site-locale.js?v=20260427c';
import { renderSiteFooter, withSiteFooterCopy } from '/assets/site-footer.js?v=20260427c';

const COPY = {
  en: {
    title: 'KHE Lab Atlas',
    description: 'A public systems atlas for the KHE homelab: ingress, deploys, private operations, and recovery.',
    siteNavAria: 'Site navigation',
    siteKicker: 'KHE Lab',
    siteTitle: 'Atlas',
    homeLabel: 'KHE home',
    languageLabel: 'Language',
    modeLabel: 'Atlas scenes',
    mapLabel: 'Animated homelab route',
    stageLabel: 'KHE Lab Atlas',
    kicker: 'Public systems map',
    headline: 'How the homelab works',
    intro: 'Ingress, deploys, private operations, and recovery in one inspectable view.',
    proofLink: 'Read the proof',
    proofKicker: 'Public proof',
    mapOpen: 'Open diagram',
    mapClose: 'Close',
    mapCloseLabel: 'Close diagram',
    mapModalKicker: 'Large diagram',
    selectedNode: 'Selected system point',
    routerPorts: 'open router ports',
    services: 'services',
    containers: 'containers',
    recoveryLayers: 'recovery layers',
    composeFiles: 'compose files',
    serviceDefinitions: 'service definitions',
    publicApps: 'public apps',
    statusReady: 'ready',
    statusRunning: 'running path',
    statusDone: 'path complete',
    snapshot: (data) => `Snapshot: ${data.source.composeFiles} Compose files`,
    snapshotFallback: 'Static snapshot',
  },
  et: {
    title: 'KHE Lab Atlas',
    description: 'KHE homelabi avalik süsteemiatlas: ingress, deploy-protsess, privaatne haldus ja taaste.',
    siteNavAria: 'Lehe navigeerimine',
    siteKicker: 'KHE Lab',
    siteTitle: 'Atlas',
    homeLabel: 'KHE avaleht',
    languageLabel: 'Keel',
    modeLabel: 'Atlase stseenid',
    mapLabel: 'Animeeritud homelabi teekond',
    stageLabel: 'KHE Lab Atlas',
    kicker: 'Avalik süsteemikaart',
    headline: 'Kuidas homelab töötab',
    intro: 'Ingress, deploy, privaatne haldus ja taaste ühes vaates.',
    proofLink: 'Vaata tõestust',
    proofKicker: 'Avalik tõestus',
    mapOpen: 'Ava diagramm',
    mapClose: 'Sulge',
    mapCloseLabel: 'Sulge diagramm',
    mapModalKicker: 'Suur diagramm',
    selectedNode: 'Valitud süsteemipunkt',
    routerPorts: 'avatud ruuteripordid',
    services: 'teenust',
    containers: 'konteinerit',
    recoveryLayers: 'taastekihti',
    composeFiles: 'Compose faili',
    serviceDefinitions: 'teenuse definitsiooni',
    publicApps: 'avalikku rakendust',
    statusReady: 'valmis',
    statusRunning: 'rada jookseb',
    statusDone: 'rada valmis',
    snapshot: (data) => `Hetkeseis: ${data.source.composeFiles} Compose faili`,
    snapshotFallback: 'Staatiline hetkeseis',
  },
};

const FALLBACK_DATA = {
  source: {
    composeFiles: 18,
    composeServiceDefinitions: 32,
  },
  metrics: {
    routerPorts: 0,
    services: 17,
    containers: 27,
    recoveryLayers: 4,
  },
  categories: {
    apps: ['games', 'landing'],
  },
};

const SCENES = [
  {
    id: 'ingress',
    number: '01',
    code: 'INGRESS',
    accent: '#67e8f9',
    accentDim: '#11343b',
    copy: {
      en: {
        nav: 'Tunnel ingress',
        tab: 'Public path',
        kicker: 'Public ingress',
        title: 'A browser reaches the homelab without opening the home router.',
        lead: 'Cloudflare accepts the public request, the server keeps an outbound tunnel open, and only the site/API layer is exposed.',
        state: 'edge - tunnel - runtime',
        proofTitle: 'Public request path',
        run: 'Trace public request',
        done: 'Request served',
      },
      et: {
        nav: 'Tunnel ingress',
        tab: 'Avalik tee',
        kicker: 'Avalik ingress',
        title: 'Brauser jõuab homelabini ilma koduruuterit avamata.',
        lead: 'Cloudflare võtab avaliku päringu vastu, server hoiab väljuvat tunnelit lahti ja avalikuks jääb ainult saidi/API kiht.',
        state: 'edge - tunnel - runtime',
        proofTitle: 'Avaliku päringu tee',
        run: 'Jälgi avalikku päringut',
        done: 'Päring serveeritud',
      },
    },
    path: ['browser', 'edge', 'tunnel', 'runtime', 'site'],
    ghostPath: ['device', 'tailscale', 'runtime'],
    nodes: [
      node('browser', 96, 382, '01', {
        en: ['Browser', 'Public visitor', 'A normal visitor only sees the public surface.', ['No admin surface', 'No account required']],
        et: ['Brauser', 'Avalik külastaja', 'Tavaline külastaja näeb ainult avalikku pinda.', ['Adminipinda pole', 'Kontot pole vaja']],
      }),
      node('edge', 300, 184, 'CF', {
        en: ['Cloudflare', 'Public edge', 'TLS and policy apply at the edge before traffic reaches home.', ['TLS at edge', 'Selected hostnames']],
        et: ['Cloudflare', 'Avalik edge', 'TLS ja poliitikad rakenduvad edge’is enne, kui liiklus koju jõuab.', ['TLS edge’is', 'Valitud hostid']],
      }),
      node('tunnel', 552, 304, 'TN', {
        en: ['Tunnel', 'Outbound ingress', 'The homelab dials out, so the router does not expose inbound ports.', ['Outbound path', 'No WAN NAT']],
        et: ['Tunnel', 'Väljuv ingress', 'Homelab loob ühenduse ise välja; ruuter ei ava sissetulevaid porte.', ['Väljuv tee', 'WAN NAT puudub']],
      }, 'core'),
      node('runtime', 724, 334, 'VM', {
        en: ['Docker VM', 'Runtime core', 'The public site, games, and support services run in one Compose-managed runtime.', ['17 services', '27 containers']],
        et: ['Docker VM', 'Runtime tuum', 'Avalik sait, mängud ja tugiteenused jooksevad ühes Compose’i hallatud runtime’is.', ['17 teenust', '27 konteinerit']],
      }, 'core'),
      node('site', 902, 190, 'APP', {
        en: ['Public apps', 'Public surface', 'These are the URLs other people can safely open.', ['khe.ee', 'games.khe.ee']],
        et: ['Avalikud rakendused', 'Avalik pind', 'Need on URL-id, mida teised inimesed saavad turvaliselt avada.', ['khe.ee', 'games.khe.ee']],
      }),
      node('device', 120, 520, 'LAN', {
        en: ['Trusted device', 'Private user', 'Admin and home traffic use private routes instead.', ['LAN', 'Mobile over VPN']],
        et: ['Usaldatud seade', 'Privaatne kasutaja', 'Admin ja kodune liiklus kasutavad privaatseid radasid.', ['LAN', 'Mobiil üle VPN-i']],
      }, 'quiet'),
      node('tailscale', 330, 520, 'TS', {
        en: ['Tailscale', 'Private lane', 'Private access stays separate from public visitors.', ['Subnet router', 'Admin path']],
        et: ['Tailscale', 'Privaatne rada', 'Privaatne ligipääs jääb avalikest külastajatest eraldi.', ['Subnet-router', 'Admini tee']],
      }, 'quiet'),
    ],
    logs: {
      en: ['GET /lab reaches Cloudflare', 'Cloudflare forwards through a tunnel', 'Tunnel terminates inside the Docker network', 'Homelab serves the static page', 'Inbound router ports stay at 0'],
      et: ['GET /lab jõuab Cloudflare’i', 'Cloudflare suunab päringu tunnelisse', 'Tunnel lõpeb Docker networkis', 'Homelab serveerib staatilise lehe', 'Ruuteri sissetulevad pordid jäävad 0 peale'],
    },
  },
  {
    id: 'deploy',
    number: '02',
    code: 'DEPLOY',
    accent: '#facc15',
    accentDim: '#332d0d',
    copy: {
      en: {
        nav: 'Checks + deploy',
        tab: 'Ship path',
        kicker: 'Ship path',
        title: 'A code change moves from Git to the public route automatically.',
        lead: 'The self-hosted runner checks the repo, builds the public artifacts, copies them into served paths, and brings the nginx containers back up.',
        state: 'git - ci - runner - live',
        proofTitle: 'Deploy path',
        run: 'Trace deploy path',
        done: 'Deploy path complete',
      },
      et: {
        nav: 'Kontrollid + deploy',
        tab: 'Tarne tee',
        kicker: 'Tarne tee',
        title: 'Koodimuudatus liigub Gitist avalikule teele automaatselt.',
        lead: 'Self-hosted runner kontrollib repo, ehitab avalikud artefaktid, kopeerib need serveeritavatesse kataloogidesse ja tõstab nginx-konteinerid uuesti üles.',
        state: 'git - ci - runner - live',
        proofTitle: 'Deploy tee',
        run: 'Jälgi deploy teed',
        done: 'Deploy tee valmis',
      },
    },
    path: ['commit', 'ci', 'runner', 'staticRoot', 'liveSite'],
    ghostPath: ['check', 'build', 'smoke', 'releaseNote'],
    nodes: [
      node('commit', 106, 370, 'GIT', {
        en: ['Commit', 'Source change', 'Changes start as tracked code, not server drift.', ['Git history', 'Reviewable diff']],
        et: ['Commit', 'Koodimuudatus', 'Muudatus algab jälgitava koodina, mitte serveris tekkinud driftina.', ['Git history', 'Ülevaadatav diff']],
      }),
      node('ci', 310, 224, 'CI', {
        en: ['GitHub Actions', 'Workflow trigger', 'A push to main dispatches the homelab runner before anything changes publicly.', ['main branch', 'Manual dispatch']],
        et: ['GitHub Actions', 'Workflow käivitaja', 'Push main branchi käivitab homelabi runneri enne, kui avalik pind muutub.', ['main branch', 'Käsitsi käivitus']],
      }),
      node('runner', 526, 352, 'RUN', {
        en: ['Self-hosted runner', 'Deploy runner', 'The runner lives in the homelab and performs install, checks, build, copy, and compose restart.', ['Repo-scoped', 'No manual SSH']],
        et: ['Self-hosted runner', 'Deploy runner', 'Runner elab homelabis ning teeb installi, kontrollid, buildi, kopeerimise ja compose restarti.', ['Repo piiratud', 'Käsitsi SSH puudub']],
      }, 'core'),
      node('staticRoot', 724, 278, 'WWW', {
        en: ['Nginx/proxy layer', 'Served paths', 'Release files land in served paths and nginx containers expose the public routes.', ['dist/landing', 'dist/games']],
        et: ['Nginx/proxy kiht', 'Serveeritavad teed', 'Release failid jõuavad serveeritavatesse kataloogidesse ja nginx-konteinerid annavad avalikud marsruudid.', ['dist/landing', 'dist/games']],
      }),
      node('liveSite', 900, 170, 'LIVE', {
        en: ['Live page', 'Public result', 'The result is a URL, not a screenshot of a private dashboard.', ['khe.ee/lab', 'Public proof']],
        et: ['Live leht', 'Avalik tulemus', 'Tulemus on URL, mitte kuvatõmmis privaatsest juhtpaneelist.', ['khe.ee/lab', 'Avalik tõestus']],
      }),
      node('check', 214, 528, 'CHK', {
        en: ['Static checks', 'Guardrails', 'HTML, locale hooks, and shared assets are verified before deploy.', ['No inline CSS', 'Locale hooks']],
        et: ['Staatilised kontrollid', 'Kaitsekontrollid', 'HTML, keelelüliti seosed ja ühised failid kontrollitakse enne deploy’d.', ['Inline CSS puudub', 'Keeleseosed']],
      }, 'quiet'),
      node('build', 422, 528, 'BLD', {
        en: ['Build', 'Artifacts', 'The build produces public landing and games outputs from the same repo.', ['dist/landing', 'dist/games']],
        et: ['Build', 'Artefaktid', 'Build loob samast repost landing- ja games-artefaktid.', ['dist/landing', 'dist/games']],
      }, 'quiet'),
      node('smoke', 628, 528, 'E2E', {
        en: ['Smoke check', 'User-visible check', 'A browser loads the public path after deploy and the console must stay clean.', ['Browser load', 'Clean console']],
        et: ['Smoke check', 'Kasutajale nähtav kontroll', 'Brauser avab pärast deploy’d avaliku tee ja konsool peab jääma puhtaks.', ['Brauser laadib', 'Puhas konsool']],
      }, 'quiet'),
      node('releaseNote', 820, 528, 'LOG', {
        en: ['Release trail', 'Freshness signal', 'A small public trace can show last deploy and last check without exposing dashboards.', ['Last deploy', 'Last check']],
        et: ['Release jälg', 'Värskuse signaal', 'Väike avalik jälg saab näidata viimast deploy’d ja kontrolli ilma juhtpaneele avamata.', ['Viimane deploy', 'Viimane kontroll']],
      }, 'quiet'),
    ],
    logs: {
      en: ['Commit reaches main', 'Runner installs dependencies and checks repo', 'Build writes dist/landing and dist/games', 'Runner copies files into served paths', 'nginx containers are recreated'],
      et: ['Commit jõuab main branchi', 'Runner paigaldab sõltuvused ja kontrollib repo', 'Build kirjutab dist/landing ja dist/games', 'Runner kopeerib failid serveeritavatesse kataloogidesse', 'nginx-konteinerid luuakse uuesti'],
    },
  },
  {
    id: 'trust',
    number: '03',
    code: 'OPS',
    accent: '#fb7185',
    accentDim: '#3b121c',
    copy: {
      en: {
        nav: 'OpenClaw + Docker',
        tab: 'Private operations',
        kicker: 'Private operations',
        title: 'OpenClaw and admin tools sit behind identity checks and scoped Docker access.',
        lead: 'OpenClaw, n8n, and stack tools sit behind Access. Docker control uses socket proxies, not a raw host socket, and the public page exposes facts instead of controls.',
        state: 'identity - workspace - scoped docker',
        proofTitle: 'Private operations boundary',
        run: 'Trace private operations',
        done: 'Private path traced',
      },
      et: {
        nav: 'OpenClaw + Docker',
        tab: 'Privaatne haldus',
        kicker: 'Privaatne haldus',
        title: 'OpenClaw ja adminitöö on identiteedikontrolli ning piiratud Dockeri ligipääsu taga.',
        lead: 'OpenClaw, n8n ja stacki tööriistad on Accessi taga. Dockeri juhtimine käib socket proxy kaudu, mitte otse hosti socketiga, ja avalik leht näitab fakte, mitte juhtnuppe.',
        state: 'identiteet - tööruum - piiratud docker',
        proofTitle: 'Privaatse halduse piir',
        run: 'Jälgi haldusrada',
        done: 'Haldusrada jälgitud',
      },
    },
    path: ['admin', 'access', 'openclaw', 'socketProxy', 'runtimeOps'],
    ghostPath: ['n8n', 'dockge', 'repoClean', 'operatorChannel'],
    nodes: [
      node('admin', 104, 348, 'ADM', {
        en: ['Admin', 'Private operator', 'Admin work starts from an authenticated human, not a public dashboard.', ['No public admin', 'Private session']],
        et: ['Admin', 'Privaatne operaator', 'Haldustöö algab autenditud kasutajast, mitte avalikust juhtpaneelist.', ['Avalikku adminit pole', 'Privaatne sessioon']],
      }),
      node('access', 306, 210, 'OTP', {
        en: ['Cloudflare Access', 'Identity check', 'Sensitive tools require identity before the request reaches the homelab.', ['Email OTP', 'Protected hostnames']],
        et: ['Cloudflare Access', 'Identiteedikontroll', 'Tundlikud tööriistad nõuavad identiteeti enne homelabini jõudmist.', ['Email OTP', 'Kaitstud hostid']],
      }),
      node('openclaw', 520, 332, 'AI', {
        en: ['OpenClaw', 'Protected workspace', 'OpenClaw is available only behind Access and inside a constrained workspace.', ['CF Access protected', 'Tracked workspace']],
        et: ['OpenClaw', 'Kaitstud tööruum', 'OpenClaw on saadaval ainult Accessi taga ja piiratud tööruumis.', ['CF Access kaitseb', 'Jälgitav tööruum']],
      }, 'core'),
      node('socketProxy', 720, 332, 'SOX', {
        en: ['Socket proxy', 'Scoped Docker', 'OpenClaw and Dockge use proxy endpoints instead of mounting the raw Docker socket.', ['Limited API', 'Reduced blast radius']],
        et: ['Socket proxy', 'Piiratud Docker', 'OpenClaw ja Dockge kasutavad proxy endpoint’e, mitte otse Docker socketit.', ['Kitsas API', 'Väiksem mõjuulatus']],
      }, 'core'),
      node('runtimeOps', 900, 210, 'VM', {
        en: ['Docker VM', 'Operations target', 'Admin actions reach the runtime only through protected and scoped paths.', ['Compose stacks', 'No broad controls']],
        et: ['Docker VM', 'Haldussiht', 'Admini tegevused jõuavad runtime’i ainult kaitstud ja piiratud teede kaudu.', ['Compose stackid', 'Laia juhtpinda pole']],
      }),
      node('n8n', 230, 520, 'n8n', {
        en: ['n8n', 'Operations automation', 'Internal reports and workflows can run without publishing raw operational data.', ['Weekly report', 'Protected workflow']],
        et: ['n8n', 'Haldusautomaatika', 'Sisemised raportid ja workflow’d saavad joosta ilma halduse toorandmeid avaldamata.', ['Nädalaraport', 'Kaitstud workflow']],
      }, 'quiet'),
      node('dockge', 420, 520, 'DG', {
        en: ['Dockge', 'Stack UI', 'Manual stack management stays behind protected admin access.', ['CF Access', 'Docker via proxy']],
        et: ['Dockge', 'Stack UI', 'Stackide käsihaldus jääb kaitstud adminiligipääsu taha.', ['CF Access', 'Docker proxy kaudu']],
      }, 'quiet'),
      node('repoClean', 620, 520, 'ENV', {
        en: ['Clean metadata', 'No secrets', 'The public atlas is generated from sanitized facts.', ['No .env values', 'No tokens']],
        et: ['Puhas metadata', 'Ilma saladusteta', 'Avalik atlas tekib puhastatud faktidest.', ['.env väärtusi pole', 'Tokeneid pole']],
      }, 'quiet'),
      node('operatorChannel', 820, 520, 'TG', {
        en: ['Operator channel', 'Private alerts', 'Telegram is an owner channel for alerts and reports, not a public feed.', ['Owner notification', 'No public feed']],
        et: ['Operaatori kanal', 'Privaatsed teavitused', 'Telegram on omaniku teavituste ja raportite kanal, mitte avalik voog.', ['Omaniku teavitus', 'Avalikku voogu pole']],
      }, 'quiet'),
    ],
    logs: {
      en: ['Admin opens a protected hostname', 'Cloudflare Access checks identity', 'OpenClaw runs inside a constrained workspace', 'Docker actions route through socket proxy', 'Public atlas exposes facts, not controls'],
      et: ['Admin avab kaitstud hosti', 'Cloudflare Access kontrollib identiteeti', 'OpenClaw töötab piiratud tööruumis', 'Dockeri tegevused liiguvad socket proxy kaudu', 'Avalik atlas näitab fakte, mitte juhtnuppe'],
    },
  },
  {
    id: 'recovery',
    number: '04',
    code: 'OBSERVE',
    accent: '#4ade80',
    accentDim: '#12351d',
    copy: {
      en: {
        nav: 'Alerts + restore',
        tab: 'Observe & recover',
        kicker: 'Observe & recover',
        title: 'Broken containers do not fail silently.',
        lead: 'Healthchecks and Autoheal handle local faults, Uptime Kuma sends Telegram alerts, and backups cover state when restart is not enough.',
        state: 'detect - alert - restart - restore',
        proofTitle: 'Recovery path',
        run: 'Run recovery drill',
        done: 'Drill complete',
      },
      et: {
        nav: 'Teavitused + taaste',
        tab: 'Jälgi ja taasta',
        kicker: 'Jälgi ja taasta',
        title: 'Katkine konteiner ei jää vaikseks.',
        lead: 'Healthcheckid ja Autoheal katavad kohalikud tõrked, Uptime Kuma saadab Telegrami teavitused ning varukoopiad katavad andmed, kui taaskäivitusest ei piisa.',
        state: 'tuvasta - teavita - restardi - taasta',
        proofTitle: 'Taaste tee',
        run: 'Käivita taasteharjutus',
        done: 'Harjutus valmis',
      },
    },
    path: ['failure', 'health', 'autoheal', 'kuma', 'telegram'],
    ghostPath: ['database', 'watchdog', 'zfs', 'offsite'],
    nodes: [
      node('failure', 102, 330, 'ERR', {
        en: ['Failure', 'Symptom starts', 'Faults are treated as classes: stuck container, VM hang, or data loss.', ['Stuck container', 'VM hang', 'Data loss class']],
        et: ['Tõrge', 'Sümptom algab', 'Tõrkeid käsitletakse klassidena: kinni jäänud konteiner, VM hang või andmekadu.', ['Kinni jäänud konteiner', 'VM hang', 'Andmekadu']],
      }, 'locked'),
      node('health', 292, 214, 'HC', {
        en: ['Healthchecks', 'Local signal', 'Services report unhealthy state before a human inspects logs.', ['Service signal', 'Autoheal input']],
        et: ['Healthcheckid', 'Kohalik signaal', 'Teenused annavad vigasest seisust märku enne, kui keegi logisid loeb.', ['Teenuse signaal', 'Autoheali sisend']],
      }),
      node('autoheal', 500, 330, 'AH', {
        en: ['Autoheal', 'Container restart', 'Unhealthy containers can recover without manual SSH.', ['Restart path', 'Socket proxy']],
        et: ['Autoheal', 'Konteineri restart', 'Vigases seisus konteinerid saavad taastuda ilma käsitsi SSH-ta.', ['Restart tee', 'Socket proxy']],
      }, 'core'),
      node('kuma', 704, 214, 'UP', {
        en: ['Uptime Kuma', 'Alert layer', 'Service monitors turn symptoms into visible alerts.', ['HTTP monitors', 'Telegram alerts']],
        et: ['Uptime Kuma', 'Teavituste kiht', 'Teenuse monitorid muudavad sümptomid nähtavateks teavitusteks.', ['HTTP monitorid', 'Telegrami teavitused']],
      }),
      node('telegram', 884, 330, 'TG', {
        en: ['Telegram', 'Owner alert', 'A service-down signal reaches the owner instead of staying hidden in a dashboard.', ['Phone push', '~90s target']],
        et: ['Telegram', 'Omaniku teavitus', 'Teenuse maasoleku signaal jõuab omanikuni, mitte ei jää peitu juhtpaneeli.', ['Telefoni push', '~90s siht']],
      }),
      node('database', 160, 528, 'DB', {
        en: ['Database dumps', 'State backup', 'Stateful services need snapshots, not only restarts.', ['Postgres dumps', 'Restore target']],
        et: ['Andmebaasi dumpid', 'Andmete varukoopia', 'Olekuga teenused vajavad hetktõmmiseid, mitte ainult restarti.', ['Postgres dumpid', 'Taaste siht']],
      }, 'quiet'),
      node('watchdog', 360, 528, 'WD', {
        en: ['Watchdog', 'VM recovery', 'When containers cannot report anything, the VM still has a local recovery layer.', ['Kernel hang', 'Host reset']],
        et: ['Watchdog', 'VM taaste', 'Kui konteinerid ei saa midagi raporteerida, on VM-il ikka kohalik taastekiht.', ['Kernel hang', 'Host reset']],
      }, 'quiet'),
      node('zfs', 590, 528, 'ZFS', {
        en: ['ZFS mirror', 'Local data', 'Bulk data sits on mirrored local storage.', ['2 x 12TB', 'NFS mount']],
        et: ['ZFS mirror', 'Kohalik data', 'Suurem andmemaht asub peegeldatud kohalikul salvestusel.', ['2 x 12TB', 'NFS mount']],
      }, 'quiet'),
      node('offsite', 834, 528, 'R2', {
        en: ['Offsite backup', 'R2 tier', 'Restic sends backup data away from the local pool.', ['Cloudflare R2', 'Retention']],
        et: ['Väline backup', 'R2 kiht', 'Restic saadab varukoopia andmed kohalikust poolist eemale.', ['Cloudflare R2', 'Säilitus']],
      }, 'quiet'),
    ],
    logs: {
      en: ['Healthcheck marks the service unhealthy', 'Autoheal restarts the container', 'Uptime Kuma keeps external visibility', 'Telegram notifies the owner', 'State recovery has local and offsite layers'],
      et: ['Healthcheck märgib teenuse vigaseks', 'Autoheal taaskäivitab konteineri', 'Uptime Kuma hoiab välise vaate', 'Telegram teavitab omanikku', 'Andmete taastel on kohalik ja väline kiht'],
    },
  },
];

let activeSceneId = 'ingress';
let activeNodeId = 'tunnel';
let labData = FALLBACK_DATA;
let isRunning = false;
let runFinished = false;
let runProgress = 0;
let playbackTimer = null;
let mapReturnFocus = null;

const sceneById = new Map(SCENES.map((scene) => [scene.id, scene]));

renderSiteFooter();

const localeController = createLocaleController({
  copy: withSiteFooterCopy(COPY),
  defaultLocale: 'en',
  links: {
    home: (locale) => `/?lang=${locale}`,
    privacy: (locale) => `/privacy?lang=${locale}`,
  },
});

function node(id, x, y, tag, copy, tone = 'normal') {
  return { id, x, y, tag, copy, tone };
}

function locale() {
  return document.documentElement.lang === 'et' ? 'et' : 'en';
}

function t() {
  return COPY[locale()];
}

function scene() {
  return sceneById.get(activeSceneId) || SCENES[0];
}

function sceneText(current = scene()) {
  return current.copy[locale()];
}

function nodeText(currentNode) {
  return currentNode.copy[locale()];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatMetric(value, label) {
  return `<div><dt>${escapeHtml(value)}</dt><dd>${escapeHtml(label)}</dd></div>`;
}

function metricItems() {
  const metrics = labData.metrics || FALLBACK_DATA.metrics;
  const source = labData.source || FALLBACK_DATA.source;
  const apps = labData.categories?.apps?.length || FALLBACK_DATA.categories.apps.length;
  const labels = t();

  if (activeSceneId === 'deploy') {
    return [
      [source.composeFiles, labels.composeFiles],
      [source.composeServiceDefinitions, labels.serviceDefinitions],
      [apps, labels.publicApps],
    ];
  }

  if (activeSceneId === 'trust') {
    return [
      ['1', locale() === 'et' ? 'OpenClaw tööruum Accessi taga' : 'OpenClaw workspace behind Access'],
      ['2', locale() === 'et' ? 'socket proxy klienti' : 'socket-proxy clients'],
      ['0', locale() === 'et' ? 'avalikku juhtpinda' : 'public control surfaces'],
    ];
  }

  if (activeSceneId === 'recovery') {
    return [
      [metrics.recoveryLayers, labels.recoveryLayers],
      [metrics.containers, labels.containers],
      ['TG', locale() === 'et' ? 'teavituskanal' : 'alert channel'],
    ];
  }

  return [
    [metrics.routerPorts, labels.routerPorts],
    [metrics.services, labels.services],
    [metrics.containers, labels.containers],
  ];
}

function selectedNode() {
  return scene().nodes.find((item) => item.id === activeNodeId) || scene().nodes[2] || scene().nodes[0];
}

function pathFor(ids) {
  const current = scene();
  const points = ids
    .map((id) => current.nodes.find((item) => item.id === id))
    .filter(Boolean);

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function pathNodes(ids) {
  const current = scene();
  return ids
    .map((id) => current.nodes.find((item) => item.id === id))
    .filter(Boolean);
}

function splitLabel(label) {
  const words = label.split(' ');
  if (words.length < 3 || label.length < 15) return [label];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
}

function stopPlayback() {
  if (playbackTimer) window.clearTimeout(playbackTimer);
  playbackTimer = null;
  isRunning = false;
  runProgress = 0;
}

function clearProofHash() {
  if (window.location.hash) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}

function bringSceneIntoView() {
  if (window.scrollY < 80) return;
  document.querySelector('.lab-scenes')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function setScene(sceneId) {
  stopPlayback();
  runFinished = false;
  activeSceneId = sceneId;
  activeNodeId = scene().path[Math.min(2, scene().path.length - 1)];
  render();
  clearProofHash();
  bringSceneIntoView();
}

function runScene() {
  stopPlayback();
  isRunning = true;
  runFinished = false;
  runProgress = 0;
  const activePath = scene().path;
  const maxTicks = Math.max(activePath.length, scene().logs[locale()].length);

  function tick() {
    activeNodeId = activePath[Math.min(runProgress, activePath.length - 1)];
    runProgress += 1;
    render();

    if (runProgress <= maxTicks) {
      playbackTimer = window.setTimeout(tick, 720);
      return;
    }

    isRunning = false;
    runFinished = true;
    runProgress = maxTicks;
    render();
  }

  tick();
}

function renderShell() {
  const current = scene();
  const copy = sceneText(current);
  document.body.dataset.scene = current.id;
  document.body.style.setProperty('--lab-accent', current.accent);
  document.body.style.setProperty('--lab-accent-dim', current.accentDim);

  document.querySelector('[data-scene-kicker]').textContent = copy.kicker;
  document.querySelector('[data-scene-title]').textContent = copy.title;
  document.querySelector('[data-scene-lead]').textContent = copy.lead;
  document.querySelector('[data-scene-code]').textContent = current.code;
  document.querySelector('[data-scene-state]').textContent = isRunning
    ? t().statusRunning
    : runFinished
      ? t().statusDone
      : copy.state;
  document.querySelector('[data-proof-title]').textContent = copy.proofTitle;
  const mapTitle = document.querySelector('[data-map-title]');
  if (mapTitle) mapTitle.textContent = `${current.number} ${copy.tab}`;
}

function renderTabs() {
  const tabs = document.querySelector('[data-scene-tabs]');
  tabs.innerHTML = SCENES.map((item) => {
    const copy = sceneText(item);
    const active = item.id === activeSceneId;
    return `
      <button type="button" class="lab-scene-tab" data-scene-target="${item.id}" aria-pressed="${active}">
        <span>${item.number}</span>
        <strong>${escapeHtml(copy.tab)}</strong>
        <small>${escapeHtml(copy.nav)}</small>
      </button>
    `;
  }).join('');

  tabs.querySelectorAll('[data-scene-target]').forEach((button) => {
    button.addEventListener('click', () => setScene(button.getAttribute('data-scene-target')));
  });
}

function renderButton() {
  const button = document.querySelector('[data-run-scene]');
  const label = button.querySelector('[data-run-label]');
  const copy = sceneText();
  button.setAttribute('aria-pressed', isRunning ? 'true' : 'false');
  label.textContent = isRunning ? t().statusRunning : runFinished ? copy.done : copy.run;
  button.onclick = () => {
    if (!isRunning) runScene();
  };
}

function renderMetrics() {
  const metrics = document.querySelector('[data-proof-metrics]');
  metrics.innerHTML = metricItems()
    .map(([value, label]) => formatMetric(value, label))
    .join('');
}

function renderTerminal() {
  const lines = scene().logs[locale()];
  const visibleCount = isRunning || runFinished
    ? Math.min(lines.length, Math.max(1, runProgress))
    : 3;
  const visible = lines.slice(0, visibleCount);
  const snapshot = labData === FALLBACK_DATA ? t().snapshotFallback : t().snapshot(labData);

  document.querySelector('[data-terminal-lines]').innerHTML = [
    `<p><span>$</span> ${escapeHtml(snapshot)}</p>`,
    ...visible.map((line) => `<p><span>></span> ${escapeHtml(line)}</p>`),
  ].join('');
}

function renderReadout() {
  const currentNode = selectedNode();
  const [title, role, body, facts] = nodeText(currentNode);
  const readout = document.querySelector('[data-readout]');

  readout.innerHTML = `
    <span>${escapeHtml(t().selectedNode)}</span>
    <strong>${escapeHtml(title)}</strong>
    <p>${escapeHtml(body)}</p>
    <ul>${facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}</ul>
  `;
}

function renderMap() {
  const current = scene();
  const svgs = document.querySelectorAll('[data-stage-map]');
  const activePathD = pathFor(current.path);
  const ghostPathD = pathFor(current.ghostPath);
  const activeNodes = new Set(current.path);
  const ghostNodes = new Set(current.ghostPath);
  const currentPathNodes = pathNodes(current.path);
  const packetNode = selectedNode();

  svgs.forEach((svg, index) => {
    const gridId = `lab-grid-v4-${index}`;
    svg.innerHTML = `
    <defs>
      <pattern id="${gridId}" width="56" height="56" patternUnits="userSpaceOnUse">
        <path d="M 56 0 L 0 0 0 56" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
      </pattern>
      <filter id="lab-v4-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="lab-v4-active-line" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.22)" />
        <stop offset="45%" stop-color="var(--lab-accent)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0.82)" />
      </linearGradient>
    </defs>
    <rect class="lab-v4-bg" x="0" y="0" width="1000" height="640"></rect>
    <rect class="lab-v4-grid" style="fill: url(#${gridId});" x="0" y="0" width="1000" height="640"></rect>
    <path class="lab-v4-horizon" d="M 42 470 C 250 385 385 420 500 340 C 650 236 810 270 960 168"></path>
    <circle class="lab-v4-ring" cx="500" cy="320" r="126"></circle>
    <circle class="lab-v4-ring lab-v4-ring-wide" cx="500" cy="320" r="265"></circle>
    <circle class="lab-v4-ring lab-v4-ring-far" cx="500" cy="320" r="410"></circle>
    ${ghostPathD ? `<path class="lab-v4-path lab-v4-path-ghost" d="${ghostPathD}"></path>` : ''}
    <path id="lab-active-path" class="lab-v4-path lab-v4-path-active" d="${activePathD}"></path>
    ${currentPathNodes.map((point, index) => {
      const next = currentPathNodes[index + 1];
      if (!next) return '';
      const midX = (point.x + next.x) / 2;
      const midY = (point.y + next.y) / 2;
      return `<circle class="lab-v4-step-dot" cx="${midX}" cy="${midY}" r="3.5"></circle>`;
    }).join('')}
    <circle class="lab-v4-packet ${isRunning ? 'is-running' : ''}" cx="${packetNode.x}" cy="${packetNode.y}" r="9"></circle>
    ${current.nodes.map((item) => {
      const [title, role] = nodeText(item);
      const active = item.id === activeNodeId;
      const onPrimary = activeNodes.has(item.id);
      const onGhost = ghostNodes.has(item.id);
      const labelLines = splitLabel(title);
      return `
        <g class="lab-v4-node ${item.tone} ${active ? 'is-active' : ''} ${onPrimary ? 'is-primary' : ''} ${onGhost ? 'is-ghost' : ''}" data-node-id="${item.id}" role="button" tabindex="0" aria-label="${escapeHtml(title)}">
          <circle class="lab-v4-node-aura" cx="${item.x}" cy="${item.y}" r="58"></circle>
          <rect class="lab-v4-node-box" x="${item.x - 74}" y="${item.y - 43}" width="148" height="86" rx="8"></rect>
          <circle class="lab-v4-node-mark" cx="${item.x - 48}" cy="${item.y - 15}" r="14"></circle>
          <text class="lab-v4-node-tag" x="${item.x - 48}" y="${item.y - 11}">${escapeHtml(item.tag)}</text>
          <text class="lab-v4-node-title" x="${item.x - 22}" y="${item.y - 18}">
            ${labelLines.map((line, index) => `<tspan x="${item.x - 22}" dy="${index === 0 ? 0 : 15}">${escapeHtml(line)}</tspan>`).join('')}
          </text>
          <text class="lab-v4-node-role" x="${item.x - 22}" y="${item.y + 27}">${escapeHtml(role)}</text>
          <rect class="lab-v4-hitbox" x="${item.x - 74}" y="${item.y - 43}" width="148" height="86" rx="8"></rect>
        </g>
      `;
    }).join('')}
  `;

    svg.querySelectorAll('[data-node-id]').forEach((item) => {
      item.addEventListener('click', () => {
        stopPlayback();
        runFinished = false;
        activeNodeId = item.getAttribute('data-node-id');
        render();
      });
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          stopPlayback();
          runFinished = false;
          activeNodeId = item.getAttribute('data-node-id');
          render();
        }
      });
    });
  });
}

function setMapModal(open) {
  const modal = document.querySelector('[data-map-modal]');
  if (!modal) return;

  if (open) {
    mapReturnFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('is-lab-map-open');
    renderMap();
    const stage = modal.querySelector('.lab-map-modal-stage');
    if (stage) {
      stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
      stage.scrollTop = Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2);
    }
    document.querySelector('[data-map-close]')?.focus();
    return;
  }

  modal.hidden = true;
  document.body.classList.remove('is-lab-map-open');
  if (mapReturnFocus instanceof HTMLElement) mapReturnFocus.focus();
}

function bindMapModal() {
  document.querySelector('[data-map-open]')?.addEventListener('click', () => setMapModal(true));
  document.querySelector('[data-map-close]')?.addEventListener('click', () => setMapModal(false));
  document.querySelector('[data-map-modal]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) setMapModal(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !document.querySelector('[data-map-modal]')?.hidden) {
      setMapModal(false);
    }
  });
}

function render() {
  renderShell();
  renderTabs();
  renderButton();
  renderMetrics();
  renderTerminal();
  renderReadout();
  renderMap();
}

document.querySelectorAll('[data-lang-option]').forEach((button) => {
  button.addEventListener('click', () => {
    window.requestAnimationFrame(render);
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
bindMapModal();
loadLabData();
