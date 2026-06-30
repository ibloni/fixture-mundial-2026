const app = document.getElementById("app");
let currentView = "home";

const groupNames = Object.keys(window.groups ?? {});

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

function buildInitialState() {
    return {
        realResults: Object.fromEntries(groupNames.map((groupName) => [
            groupName,
            buildFixtures(window.groups[groupName])
        ])),
        forecastResults: Object.fromEntries(groupNames.map((groupName) => [
            groupName,
            buildFixtures(window.groups[groupName])
        ]))
    };
}

const STORAGE_KEY = "fixture2026-state";

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;
        return JSON.parse(saved);
    } catch (error) {
        console.warn("No se pudo cargar el estado guardado", error);
        return null;
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.warn("No se pudo guardar el estado", error);
    }
}

let state = loadState() ?? JSON.parse(JSON.stringify(buildInitialState()));

function getGroupTeams(groupName) {
    return window.groups?.[groupName] ?? [];
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

function isResultComplete(fixture) {
    return fixture.homeGoals !== "" && fixture.awayGoals !== "";
}

function getGroupStandings(groupName, mode) {
    const teamCodes = getGroupTeams(groupName);
    const fixtures = getGroupResults(groupName, mode);
    const table = teamCodes.map((code) => ({
        code,
        groupName,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0
    }));

    fixtures.filter(isResultComplete).forEach((fixture) => {
        const home = table.find((entry) => entry.code === fixture.home);
        const away = table.find((entry) => entry.code === fixture.away);

        if (!home || !away) {
            return;
        }

        const homeGoals = Number(fixture.homeGoals);
        const awayGoals = Number(fixture.awayGoals);

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

    return table.sort(compareTeams);
}

function compareTeams(a, b) {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.code.localeCompare(b.code);
}

function getGroupSummary(mode) {
    return groupNames.map((groupName) => ({
        groupName,
        standings: getGroupStandings(groupName, mode)
    }));
}

function getQualifiedTeams(mode) {
    const groups = getGroupSummary(mode);
    const firsts = groups.map(({ standings }) => standings[0]);
    const seconds = groups.map(({ standings }) => standings[1]);
    const thirds = groups.map(({ standings }) => standings[2]).sort(compareTeams).slice(0, 8);

    return { firsts, seconds, thirds };
}

function getRoundOf32(mode) {
    const { firsts, seconds, thirds } = getQualifiedTeams(mode);

    return [
        [firsts[0], thirds[7]],
        [firsts[1], thirds[6]],
        [firsts[2], thirds[5]],
        [firsts[3], thirds[4]],
        [firsts[4], thirds[3]],
        [firsts[5], thirds[2]],
        [firsts[6], thirds[1]],
        [firsts[7], thirds[0]],
        [firsts[8], seconds[11]],
        [firsts[9], seconds[10]],
        [firsts[10], seconds[9]],
        [firsts[11], seconds[8]],
        [seconds[0], seconds[1]],
        [seconds[2], seconds[3]],
        [seconds[4], seconds[5]],
        [seconds[6], seconds[7]]
    ];
}

function renderHomeView() {
    return `
        <div class="card">
            <h2>Bienvenido</h2>
            <p>Los grupos quedan fijos. Los usuarios cargan resultados y la app arma automaticamente clasificados y llaves.</p>
            <div class="actions">
                <button id="official">Cargar resultados</button>
                <button id="forecast">Ver llaves</button>
            </div>
        </div>
    `;
}

function renderFixedTeamList(groupName) {
    return `
        <ul class="fixed-team-list">
            ${getGroupTeams(groupName).map((code) => `
                <li>
                    <span>${getTeam(code).flag}</span>
                    <strong>${getTeam(code).name}</strong>
                    <small>${code}</small>
                </li>
            `).join("")}
        </ul>
    `;
}

function renderResultPanel(groupName, mode, title) {
    const fixtures = getGroupResults(groupName, mode);

    return `
        <div class="result-panel">
            <h4>${title}</h4>
            <div class="group-fixtures">
                ${fixtures.map((fixture, index) => `
                    <div class="fixture-row">
                        <span class="fixture-team">${getTeam(fixture.home).name}</span>
                        <input data-mode="${mode}" data-group="${groupName}" data-fixture="${index}" data-side="home" type="number" min="0" inputmode="numeric" value="${fixture.homeGoals}">
                        <span class="fixture-separator">-</span>
                        <input data-mode="${mode}" data-group="${groupName}" data-fixture="${index}" data-side="away" type="number" min="0" inputmode="numeric" value="${fixture.awayGoals}">
                        <span class="fixture-team">${getTeam(fixture.away).name}</span>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

function renderStandings(groupName, mode) {
    const standings = getGroupStandings(groupName, mode);

    return `
        <ol class="standings-list">
            ${standings.map((team, index) => `
                <li class="standing-row ${index < 2 ? "qualifier" : ""} ${index === 2 ? "third-place" : ""}">
                    <span class="standing-pos">${index + 1}</span>
                    <span class="standing-team">${getTeam(team.code).flag} ${getTeam(team.code).name}</span>
                    <span class="standing-points">${team.pts} pts</span>
                </li>
            `).join("")}
        </ol>
    `;
}

function renderGroupsView() {
    const groupsMarkup = groupNames.map((groupName) => `
        <section class="group-card">
            <div class="group-card-header">
                <h3>Grupo ${groupName}</h3>
                <p>Equipos fijos. Solo se editan los resultados.</p>
            </div>

            ${renderFixedTeamList(groupName)}

            <div class="results-panels">
                ${renderResultPanel(groupName, "real", "Resultado real")}
                ${renderResultPanel(groupName, "forecast", "Pronostico")}
            </div>

            <h4 class="table-title">Tabla por resultado real</h4>
            ${renderStandings(groupName, "real")}
        </section>
    `).join("");

    return `
        <div class="card">
            <h2>Fase de Grupos</h2>
            <p>Los grupos ya no se modifican desde la pantalla. Carga marcadores y la tabla se recalcula al instante.</p>
        </div>

        <div class="groups-grid">
            ${groupsMarkup}
        </div>
    `;
}

function renderQualificationSummary(mode) {
    const { firsts, seconds, thirds } = getQualifiedTeams(mode);

    return `
        <div class="qualification-columns">
            <div>
                <h4>Primeros</h4>
                ${firsts.map((team) => `<p>${team.groupName}: ${getTeam(team.code).name}</p>`).join("")}
            </div>
            <div>
                <h4>Segundos</h4>
                ${seconds.map((team) => `<p>${team.groupName}: ${getTeam(team.code).name}</p>`).join("")}
            </div>
            <div>
                <h4>Mejores terceros</h4>
                ${thirds.map((team) => `<p>${team.groupName}: ${getTeam(team.code).name} (${team.pts} pts)</p>`).join("")}
            </div>
        </div>
    `;
}

function renderRoundOf32(mode) {
    return `
        <div class="bracket-list">
            ${getRoundOf32(mode).map(([home, away], index) => `
                <div class="match-card">
                    <span class="match-label">16avos ${index + 1}</span>
                    <div class="match-line">
                        <strong>${home ? getTeam(home.code).name : "Por definir"}</strong>
                        <span class="match-vs">vs</span>
                        <strong>${away ? getTeam(away.code).name : "Por definir"}</strong>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function renderBracketView() {
    const bracketModes = [
        { key: "real", title: "Llave por resultados reales" },
        { key: "forecast", title: "Llave por pronostico" }
    ];

    return `
        <div class="card">
            <h2>Llaves</h2>
            <p>Las llaves se arman automaticamente desde las tablas: pasan los dos primeros de cada grupo y los ocho mejores terceros.</p>
        </div>

        <div class="bracket-grid">
            ${bracketModes.map(({ key, title }) => `
                <section class="stage-card">
                    <h3>${title}</h3>
                    ${renderQualificationSummary(key)}
                    ${renderRoundOf32(key)}
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

    if (event.target.id === "save-state") {
        saveState();
        const notice = document.createElement("div");
        notice.className = "save-notice";
        notice.textContent = "Datos guardados";
        document.body.appendChild(notice);
        setTimeout(() => notice.remove(), 1500);
    }
});

document.addEventListener("change", (event) => {
    const target = event.target;

    if (target.matches("input[data-mode][data-group][data-fixture][data-side]")) {
        const { mode, group, fixture, side } = target.dataset;
        updateGroupResult(mode, group, fixture, side, target.value);
        saveState();
        loadView(currentView);
    }
});

function renderSaveButton() {
    return `
        <button id="save-state">Guardar datos</button>
    `;
}

function renderHomeView() {
    return `
        <div class="card">
            <h2>Bienvenido</h2>
            <p>Los resultados se guardan automáticamente en tu navegador. También podés usar el botón para forzar el guardado.</p>
            <div class="actions">
                <button id="official">Cargar resultados</button>
                <button id="forecast">Ver llaves</button>
                ${renderSaveButton()}
            </div>
        </div>
    `;
}

function renderBracketView() {
    const bracketModes = [
        { key: "real", title: "Llave por resultados reales" },
        { key: "forecast", title: "Llave por pronostico" }
    ];

    return `
        <div class="card">
            <h2>Llaves</h2>
            <p>Las llaves se arman automáticamente desde las tablas: pasan los dos primeros de cada grupo y los ocho mejores terceros.</p>
            <div class="actions save-actions">
                ${renderSaveButton()}
            </div>
        </div>

        <div class="bracket-grid">
            ${bracketModes.map(({ key, title }) => `
                <section class="stage-card">
                    <h3>${title}</h3>
                    ${renderQualificationSummary(key)}
                    ${renderRoundOf32(key)}
                </section>
            `).join("")}
        </div>
    `;
}

loadView("home");
