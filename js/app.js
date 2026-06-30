const app = document.getElementById("app");
let currentView = "home";

const getTeam = (code) => window.teams?.[code] ?? {
    code,
    name: code.startsWith("TBD") ? "Por definir" : code,
    shortName: code,
    flag: "",
    status: "pending"
};

function renderTeam(code) {
    const team = getTeam(code);
    const statusClass = team.status === "confirmed" ? "confirmed" : "pending";

    return `
        <li class="team ${statusClass}">
            <span class="team-flag">${team.flag}</span>
            <span class="team-name">${team.name}</span>
            <span class="team-code">${team.code}</span>
        </li>
    `;
}

function createGroupFixtures(teamCodes) {
    return [
        { home: teamCodes[0], away: teamCodes[1], homeGoals: "", awayGoals: "" },
        { home: teamCodes[2], away: teamCodes[3], homeGoals: "", awayGoals: "" },
        { home: teamCodes[0], away: teamCodes[2], homeGoals: "", awayGoals: "" },
        { home: teamCodes[1], away: teamCodes[3], homeGoals: "", awayGoals: "" },
        { home: teamCodes[0], away: teamCodes[3], homeGoals: "", awayGoals: "" },
        { home: teamCodes[1], away: teamCodes[2], homeGoals: "", awayGoals: "" }
    ];
}

function buildInitialState() {
    return {
        groupResults: Object.fromEntries(
            Object.entries(window.groups ?? {}).map(([groupName, teamCodes]) => [groupName, createGroupFixtures(teamCodes)])
        )
    };
}

let state = JSON.parse(JSON.stringify(buildInitialState()));

function getGroupResults(groupName) {
    return state.groupResults[groupName] ?? createGroupFixtures(window.groups?.[groupName] ?? []);
}

function getGroupStandings(groupName) {
    const teamCodes = window.groups?.[groupName] ?? [];
    const fixtures = getGroupResults(groupName);

    const table = teamCodes.map((code) => ({
        code,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0
    }));

    fixtures.forEach((fixture) => {
        const home = table.find((entry) => entry.code === fixture.home);
        const away = table.find((entry) => entry.code === fixture.away);

        if (!home || !away) {
            return;
        }

        const homeGoals = Number(fixture.homeGoals || 0);
        const awayGoals = Number(fixture.awayGoals || 0);

        home.played += 1;
        away.played += 1;
        home.gf += homeGoals;
        away.gf += awayGoals;
        home.ga += awayGoals;
        away.ga += homeGoals;
        home.gd = home.gf - home.ga;
        away.gd = away.gf - away.ga;

        if (homeGoals > awayGoals) {
            home.wins += 1;
            away.losses += 1;
            home.pts += 3;
        } else if (homeGoals < awayGoals) {
            away.wins += 1;
            home.losses += 1;
            away.pts += 3;
        } else {
            home.draws += 1;
            away.draws += 1;
            home.pts += 1;
            away.pts += 1;
        }
    });

    return table.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.code.localeCompare(b.code);
    });
}

function getGroupSummary() {
    return Object.entries(window.groups ?? {}).map(([groupName]) => ({
        groupName,
        standings: getGroupStandings(groupName)
    }));
}

function buildRoundOf32() {
    const groups = getGroupSummary();
    const winners = groups.map((item) => item.standings[0].code);
    const runnersUp = groups.map((item) => item.standings[1].code);
    const thirdPlaces = groups.map((item) => item.standings[2].code).sort((a, b) => {
        const teamA = getTeam(a);
        const teamB = getTeam(b);
        return teamA.name.localeCompare(teamB.name);
    });

    return [
        { home: winners[0], away: runnersUp[1] },
        { home: winners[2], away: runnersUp[3] },
        { home: winners[4], away: runnersUp[5] },
        { home: winners[6], away: runnersUp[7] },
        { home: winners[8], away: runnersUp[9] },
        { home: winners[10], away: runnersUp[11] },
        { home: winners[1], away: runnersUp[0] },
        { home: winners[3], away: runnersUp[2] },
        { home: winners[5], away: runnersUp[4] },
        { home: winners[7], away: runnersUp[6] },
        { home: winners[9], away: runnersUp[8] },
        { home: winners[11], away: runnersUp[10] },
        { home: thirdPlaces[0], away: thirdPlaces[1] },
        { home: thirdPlaces[2], away: thirdPlaces[3] },
        { home: thirdPlaces[4], away: thirdPlaces[5] },
        { home: thirdPlaces[6], away: thirdPlaces[7] }
    ];
}

function renderHomeView() {
    return `
        <div class="card">
            <h2>Bienvenido</h2>
            <p>El fixture ya quedó armado para la fase de grupos y las llaves. Podés cargar los resultados y ver cómo se arma el pronóstico automáticamente.</p>
            <div class="actions">
                <button id="official">Ver grupos</button>
                <button id="forecast">Ir al pronóstico</button>
            </div>
        </div>
    `;
}

function renderGroupsView() {
    const groupsMarkup = Object.entries(window.groups ?? {}).map(([groupName, teamCodes]) => {
        const standings = getGroupStandings(groupName);
        const fixtures = getGroupResults(groupName);

        return `
            <section class="group-card">
                <div class="group-card-header">
                    <h3>Grupo ${groupName}</h3>
                    <p>Clasifican ${getTeam(standings[0].code).name} y ${getTeam(standings[1].code).name}</p>
                </div>

                <ol class="standings-list">
                    ${standings.map((team, index) => `
                        <li class="standing-row ${index < 2 ? "qualifier" : ""}">
                            <span class="standing-pos">${index + 1}</span>
                            <span class="standing-team">${getTeam(team.code).flag} ${getTeam(team.code).name}</span>
                            <span class="standing-points">${team.pts} pts</span>
                        </li>
                    `).join("")}
                </ol>

                <div class="group-fixtures">
                    ${fixtures.map((fixture, index) => `
                        <div class="fixture-row">
                            <span class="fixture-team">${getTeam(fixture.home).name}</span>
                            <input data-group="${groupName}" data-fixture="${index}" data-side="home" type="number" min="0" inputmode="numeric" value="${fixture.homeGoals}">
                            <span class="fixture-separator">-</span>
                            <input data-group="${groupName}" data-fixture="${index}" data-side="away" type="number" min="0" inputmode="numeric" value="${fixture.awayGoals}">
                            <span class="fixture-team">${getTeam(fixture.away).name}</span>
                        </div>
                    `).join("")}
                </div>
            </section>
        `;
    }).join("");

    return `
        <div class="card">
            <h2>Fase de Grupos</h2>
            <p>Completá los resultados de cada partido y la tabla se recalcula sola para definir los clasificados.</p>
        </div>

        <div class="groups-grid">
            ${groupsMarkup}
        </div>
    `;
}

function renderBracketView() {
    const groups = getGroupSummary();
    const roundOf32 = buildRoundOf32();

    return `
        <div class="card">
            <h2>Pronóstico y llaves</h2>
            <p>Las llaves se van armando en base a los resultados de la fase de grupos.</p>
        </div>

        <div class="qualification-grid">
            ${groups.map(({ groupName, standings }) => `
                <div class="qualification-card">
                    <h3>Grupo ${groupName}</h3>
                    <p>1. ${getTeam(standings[0].code).name}</p>
                    <p>2. ${getTeam(standings[1].code).name}</p>
                </div>
            `).join("")}
        </div>

        <div class="stage-card">
            <h3>Octavos de Final</h3>
            <div class="bracket-list">
                ${roundOf32.map((match, index) => `
                    <div class="match-card">
                        <span class="match-label">Partido ${index + 1}</span>
                        <div class="match-teams">
                            <span class="team-chip">${getTeam(match.home).flag} ${getTeam(match.home).name}</span>
                            <span class="match-vs">vs</span>
                            <span class="team-chip">${getTeam(match.away).flag} ${getTeam(match.away).name}</span>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

function loadView(view) {
    currentView = view;
    app.innerHTML = {
        home: renderHomeView(),
        groups: renderGroupsView(),
        bracket: renderBracketView()
    }[view] || renderHomeView();

    document.querySelectorAll("nav button").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.view === view);
    });
}

document.querySelectorAll("nav button").forEach((btn) => {
    btn.addEventListener("click", () => {
        loadView(btn.dataset.view);
    });
});

document.addEventListener("click", (event) => {
    if (event.target.id === "official") {
        loadView("groups");
    }

    if (event.target.id === "forecast") {
        loadView("bracket");
    }
});

document.addEventListener("change", (event) => {
    const target = event.target;

    if (target.matches("input[data-group][data-fixture][data-side]")) {
        const { group, fixture, side } = target.dataset;
        const fixtures = state.groupResults[group];
        const current = fixtures?.[fixture];

        if (current) {
            current[side === "home" ? "homeGoals" : "awayGoals"] = target.value;
            loadView(currentView);
        }
    }
});

loadView("home");
