/*
Las validaciones para este formulaqrio se realizaran mediante  el uso de Expresiones Regulares, las cuales 
las vamos a dividir en 3:
1.-Texto para el nombre
2.-Numerico para la boleta
3.-Debe  de tener un patron para la fecha

Las expresiones regulares, son patrones que nos ayudan a validar codenas bajo ciertos condiciones.

*/

const patrones = {
    nombre : /^[A-Za-zÁÉÍÓÚÑáéíóúñÜü\s]{2,60}$/,
    boleta : /^\d{10}$/,
    fecha : /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/
}

const mensajes = {

    nombre: "Solo letras y espacios, entre 2 y 60 caracteres",

    boleta: "Debe tener exactamente 10 dígitos numéricos",

    fecha: "La fecha debe tener el formato DD/MM/AAAA."

};

function validarCampo(campo, valor) {

    return patrones[campo].test(valor.trim());

}

//para validsr el formulario debemos ocupar los principios de obtencion 
y manipulacion de los elementos del DOM //

if (typeof document !=='undefined'){
    const formulario = document.getElementById('form-registro');

    formulario.addEventListener('submit' , (evento)=>{
        evento
    })

    


}