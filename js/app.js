const app = document.getElementById("app");
let currentView = "home";

const getTeam = (code) => window.teams?.[code] ?? {
    code,
    name: code.startsWith("TBD") ? "Por definir" : code,
    shortName: code,
    flag: "",
    status: "pending"
};

function buildFixtures(teamCodes) {
    const teams = teamCodes.slice(0, 4);
    return [
        { home: teams[0], away: teams[1], homeGoals: "", awayGoals: "" },
        { home: teams[2], away: teams[3], homeGoals: "", awayGoals: "" },
        { home: teams[0], away: teams[2], homeGoals: "", awayGoals: "" },
        { home: teams[1], away: teams[3], homeGoals: "", awayGoals: "" },
        { home: teams[0], away: teams[3], homeGoals: "", awayGoals: "" },
        { home: teams[1], away: teams[2], homeGoals: "", awayGoals: "" }
    ];
}

function buildBracketTemplate() {
    return Array.from({ length: 16 }, () => ({ home: "", away: "" }));
}

function buildInitialState() {
    const groupEntries = Object.entries(window.groups ?? {});
    return {
        groups: Object.fromEntries(groupEntries.map(([groupName, teamCodes]) => [groupName, [...teamCodes]])),
        realResults: Object.fromEntries(groupEntries.map(([groupName, teamCodes]) => [groupName, buildFixtures(teamCodes)])),
        forecastResults: Object.fromEntries(groupEntries.map(([groupName, teamCodes]) => [groupName, buildFixtures(teamCodes)])),
        realBracket: buildBracketTemplate(),
        forecastBracket: buildBracketTemplate()
    };
}

let state = JSON.parse(JSON.stringify(buildInitialState()));

function getGroupTeams(groupName) {
    const teams = state.groups?.[groupName] ?? [];
    return teams.filter(Boolean);
}

function getGroupResults(groupName, mode) {
    const results = mode === "forecast" ? state.forecastResults : state.realResults;
    return results[groupName] ?? buildFixtures(getGroupTeams(groupName));
}

function updateGroupResult(mode, groupName, fixtureIndex, side, value) {
    const results = mode === "forecast" ? state.forecastResults : state.realResults;
    const fixture = results[groupName]?.[fixtureIndex];
    if (!fixture) {
        return;
    }
    fixture[side === "home" ? "homeGoals" : "awayGoals"] = value;
}

function getGroupStandings(groupName, mode) {
    const teamCodes = getGroupTeams(groupName);
    const fixtures = getGroupResults(groupName, mode);
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

function getGroupSummary(mode) {
    return Object.entries(state.groups ?? {}).map(([groupName]) => ({
        groupName,
        standings: getGroupStandings(groupName, mode)
    }));
}

function getBracketMatches(mode) {
    return mode === "forecast" ? state.forecastBracket : state.realBracket;
}

function updateBracketMatch(mode, matchIndex, side, value) {
    const bracket = mode === "forecast" ? state.forecastBracket : state.realBracket;
    bracket[matchIndex][side] = value;
}

function renderHomeView() {
    return `
        <div class="card">
            <h2>Bienvenido</h2>
            <p>Ahora la app permite cargar los grupos reales, separar el resultado real del pronóstico y editar las llaves manualmente.</p>
            <div class="actions">
                <button id="official">Ver grupos</button>
                <button id="forecast">Ir al pronóstico</button>
            </div>
        </div>
    `;
}

function renderTeamSelector(groupName, index) {
    const currentCode = state.groups[groupName]?.[index] || "";
    const options = [...new Set([...(Object.keys(window.teams || {})), ...Object.values(state.groups).flatMap((codes) => codes.filter(Boolean))])];

    return `
        <label class="team-slot">
            <span>Slot ${index + 1}</span>
            <select data-role="team-slot" data-group="${groupName}" data-index="${index}">
                <option value="">Por definir</option>
                ${options.map((code) => `
                    <option value="${code}" ${code === currentCode ? "selected" : ""}>${getTeam(code).flag} ${getTeam(code).name}</option>
                `).join("")}
            </select>
        </label>
    `;
}

function renderGroupsView() {
    const groupsMarkup = Object.entries(state.groups ?? {}).map(([groupName]) => {
        const standings = getGroupStandings(groupName, "real");
        const realFixtures = getGroupResults(groupName, "real");
        const forecastFixtures = getGroupResults(groupName, "forecast");

        return `
            <section class="group-card">
                <div class="group-card-header">
                    <h3>Grupo ${groupName}</h3>
                    <p>Elegí los equipos del grupo y completá los resultados.</p>
                </div>

                <div class="team-slots-grid">
                    ${[0, 1, 2, 3].map((index) => renderTeamSelector(groupName, index)).join("")}
                </div>

                <div class="results-panels">
                    <div class="result-panel">
                        <h4>Resultado real</h4>
                        <div class="group-fixtures">
                            ${realFixtures.map((fixture, index) => `
                                <div class="fixture-row">
                                    <span class="fixture-team">${getTeam(fixture.home).name}</span>
                                    <input data-mode="real" data-group="${groupName}" data-fixture="${index}" data-side="home" type="number" min="0" inputmode="numeric" value="${fixture.homeGoals}">
                                    <span class="fixture-separator">-</span>
                                    <input data-mode="real" data-group="${groupName}" data-fixture="${index}" data-side="away" type="number" min="0" inputmode="numeric" value="${fixture.awayGoals}">
                                    <span class="fixture-team">${getTeam(fixture.away).name}</span>
                                </div>
                            `).join("")}
                        </div>
                    </div>

                    <div class="result-panel">
                        <h4>Pronóstico</h4>
                        <div class="group-fixtures">
                            ${forecastFixtures.map((fixture, index) => `
                                <div class="fixture-row">
                                    <span class="fixture-team">${getTeam(fixture.home).name}</span>
                                    <input data-mode="forecast" data-group="${groupName}" data-fixture="${index}" data-side="home" type="number" min="0" inputmode="numeric" value="${fixture.homeGoals}">
                                    <span class="fixture-separator">-</span>
                                    <input data-mode="forecast" data-group="${groupName}" data-fixture="${index}" data-side="away" type="number" min="0" inputmode="numeric" value="${fixture.awayGoals}">
                                    <span class="fixture-team">${getTeam(fixture.away).name}</span>
                                </div>
                            `).join("")}
                        </div>
                    </div>
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
            </section>
        `;
    }).join("");

    return `
        <div class="card">
            <h2>Fase de Grupos</h2>
            <p>Podés corregir los equipos de cada grupo y completar los resultados reales y los pronósticos por separado.</p>
        </div>

        <div class="groups-grid">
            ${groupsMarkup}
        </div>
    `;
}

function renderBracketView() {
    const realGroups = getGroupSummary("real");
    const forecastGroups = getGroupSummary("forecast");
    const bracketModes = [
        { key: "real", title: "Real", groups: realGroups, matches: getBracketMatches("real") },
        { key: "forecast", title: "Pronóstico", groups: forecastGroups, matches: getBracketMatches("forecast") }
    ];

    return `
        <div class="card">
            <h2>Llaves</h2>
            <p>Podés ajustar las llaves y los cruces tanto para el resultado real como para tu pronóstico.</p>
        </div>

        <div class="bracket-grid">
            ${bracketModes.map(({ key, title, groups, matches }) => `
                <section class="stage-card">
                    <h3>${title}</h3>
                    <div class="qualification-grid">
                        ${groups.map(({ groupName, standings }) => `
                            <div class="qualification-card">
                                <h3>Grupo ${groupName}</h3>
                                <p>1. ${getTeam(standings[0].code).name}</p>
                                <p>2. ${getTeam(standings[1].code).name}</p>
                            </div>
                        `).join("")}
                    </div>

                    <div class="bracket-list">
                        ${matches.map((match, index) => {
                            const availableTeams = groups.flatMap(({ standings }) => standings.map((team) => team.code));
                            return `
                                <div class="match-card">
                                    <span class="match-label">Partido ${index + 1}</span>
                                    <div class="match-editor">
                                        <select data-mode="${key}" data-match="${index}" data-side="home">
                                            <option value="">Elegí un equipo</option>
                                            ${availableTeams.map((code) => `
                                                <option value="${code}" ${match.home === code ? "selected" : ""}>${getTeam(code).flag} ${getTeam(code).name}</option>
                                            `).join("")}
                                        </select>
                                        <span class="match-vs">vs</span>
                                        <select data-mode="${key}" data-match="${index}" data-side="away">
                                            <option value="">Elegí un equipo</option>
                                            ${availableTeams.map((code) => `
                                                <option value="${code}" ${match.away === code ? "selected" : ""}>${getTeam(code).flag} ${getTeam(code).name}</option>
                                            `).join("")}
                                        </select>
                                    </div>
                                </div>
                            `;
                        }).join("")}
                    </div>
                </section>
            `).join("")}
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

    if (target.dataset.role === "team-slot") {
        const { group, index } = target.dataset;
        state.groups[group][index] = target.value;
        loadView(currentView);
        return;
    }

    if (target.matches("input[data-mode][data-group][data-fixture][data-side]")) {
        const { mode, group, fixture, side } = target.dataset;
        updateGroupResult(mode, group, fixture, side, target.value);
        loadView(currentView);
        return;
    }

    if (target.matches("select[data-mode][data-match][data-side]")) {
        const { mode, match, side } = target.dataset;
        updateBracketMatch(mode, match, side, target.value);
        loadView(currentView);
    }
});

loadView("home");
