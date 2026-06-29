const app = document.getElementById("app");

const views = {

home:`

<div class="card">

<h2>Bienvenido</h2>

<br>

<p>Elegí cómo querés usar el Fixture.</p>

<br>

<button id="official">🌎 Mundial Oficial</button>

<button id="forecast">🎯 Mi Pronóstico</button>

</div>

`,

groups:`

<div class="card">

<h2>Fase de Grupos</h2>

<p>Aquí aparecerán los 12 grupos.</p>

</div>

`,

bracket:`

<div class="card">

<h2>Llaves</h2>

<p>Aquí aparecerán las llaves oficiales FIFA.</p>

</div>

`

}

function loadView(view){

app.innerHTML=views[view];

document.querySelectorAll("nav button").forEach(btn=>{

btn.classList.remove("active");

if(btn.dataset.view===view){

btn.classList.add("active");

}

});

}

loadView("home");

document.querySelectorAll("nav button").forEach(btn=>{

btn.addEventListener("click",()=>{

loadView(btn.dataset.view);

});

});