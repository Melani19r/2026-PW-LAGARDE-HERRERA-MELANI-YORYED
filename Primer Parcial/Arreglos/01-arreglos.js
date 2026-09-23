// 01-arreglos.js
// Métodos de arreglo más usados en JS/Node — practícalos sobre esta lista
// de talleres (misma forma que la API real de CECyT9). Completa cada TODO.

const talleres = [
  { nombre: 'Introducción a Python', instructor: 'Ing. María López', cupo: 25, inscritos: 25 },
  { nombre: 'Fundamentos de Redes', instructor: 'Ing. Carlos Ramírez', cupo: 30, inscritos: 18 },
  { nombre: 'Diseño de Bases de Datos', instructor: 'Ing. Ana Torres', cupo: 20, inscritos: 20 },
  { nombre: 'Desarrollo Web con JS', instructor: 'Ing. María López', cupo: 25, inscritos: 10 },
];

// TODO: forEach — imprime "- <nombre> (<inscritos>/<cupo>)" de cada taller
console.log("Aplicando un forEach para imprimir los talleres:");
talleres.forEach((t) => console.log(`- ${t.nombre} (${t.inscritos}/${t.cupo})`));

// TODO: map — crea un arreglo `nombres` solo con los nombres de los talleres
console.log("Aplicando funcion Map con solo Nombres")
const nombres = talleres.map((t) => t.nombre);
console.log(nombres);

// TODO: filter — crea un arreglo `llenos` con los talleres donde inscritos >= cupo
console.log("Aplicando la función Filter en los talleres")
const llenos = talleres.filter((t) => t.inscritos >= t.cupo);
console.log(llenos.map((t) => t.nombre));

// TODO: find — encuentra el PRIMER taller impartido por 'Ing. María López'
console.log("Aplicando la función Find")
const primerTallerMaria = talleres.find((t) => t.instructor === 'Ing. María López');
console.log(primerTallerMaria);

// TODO: reduce — calcula `totalInscritos`, la suma de inscritos de todos los talleres
console.log("Aplicando la función Reduce")
const totalInscritos = talleres.reduce((total, t) => total + t.inscritos, 0);
console.log(totalInscritos);

// TODO: filter + map encadenados — nombres de los talleres que SÍ tienen cupo disponible
console.log("Aplicando Filter + Map")
const talleresConCupo = talleres
  .filter((t) => t.inscritos < t.cupo)
  .map((t) => t.nombre);
console.log(talleresConCupo);

// Resultados listos para mostrarse en la tabla del HTML
const resultadosTabla = [
    { metodo: "forEach()", descripcion: "Imprimir formato de talleres", resultado: "Revisar consola (impresión por cada taller)" },
    { metodo: "map()", descripcion: "Nombres de los talleres", resultado: nombres.join(", ") },
    { metodo: "filter()", descripcion: "Talleres llenos (inscritos >= cupo)", resultado: llenos.map(t => t.nombre).join(", ") },
    { metodo: "find()", descripcion: "Primer taller de Ing. María López", resultado: primerTallerMaria ? primerTallerMaria.nombre : "No encontrado" },
    { metodo: "reduce()", descripcion: "Suma total de inscritos", resultado: totalInscritos },
    { metodo: "filter + map", descripcion: "Talleres con cupo disponible", resultado: talleresConCupo.join(", ") }
];