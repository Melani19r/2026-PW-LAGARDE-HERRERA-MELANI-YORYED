// 01-arreglos.js
const talleres = [
  { nombre: 'Introducción a Python', instructor: 'Ing. María López', cupo: 25, inscritos: 25 },
  { nombre: 'Fundamentos de Redes', instructor: 'Ing. Carlos Ramírez', cupo: 30, inscritos: 18 },
  { nombre: 'Diseño de Bases de Datos', instructor: 'Ing. Ana Torres', cupo: 20, inscritos: 20 },
  { nombre: 'Desarrollo Web con JS', instructor: 'Ing. María López', cupo: 25, inscritos: 10 },
];

document.addEventListener("DOMContentLoaded", () => {
    const tbody = document.getElementById('cuerpo-tabla');
    
    if (tbody) {
        talleres.forEach(t => {
            const fila = `
                <tr>
                    <td>${t.nombre}</td>
                    <td>${t.instructor}</td>
                    <td>${t.cupo}</td>
                    <td>${t.inscritos}</td>
                </tr>
            `;
            tbody.innerHTML += fila;
        });
    }
});