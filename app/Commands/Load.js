'use strict'
const Database = use('Database')
const {Command} = use('@adonisjs/ace')
const Examen = use('App/Models/Examen')
const Nodo = use('App/Models/Nodo')
const NodoExamen = use('App/Models/NodoExamen')
const {performance, PerformanceObserver} = require('perf_hooks');
const mongoose = require('mongoose')

const mongoPaciente = mongoose.model('paciente', {
    nombre: String,
    examenes: Array,
    ticket: String,
    indice: Number,
});
const mongoExamen = mongoose.model('examen', {
    id: Number,
    indice: String,
    codigo: String,
    nombre: String,
    cAyuna: String,
    tipoExamen: String,
    grupoPrestacion: String,
    requerimientos: [{
        id: Number,
        indice: String,
        codigo: String,
        nombre: String,
        cAyuna: String,
        tipoExamen: String,
        grupoPrestacion: String,
    }]
})
const mongoNodo = mongoose.model('nodo', {
    id: Number,
    sede_id: Number,
    codigo: String,
    nombre: String,
    user_id: Number,
    paciente_id: Number,
    area: String,
    color: String,
    tiempo_atencion: Number,
    tiempo_llamada: Number,
    tiempo_espera: Number,
    estado: String,
    tiempo_max: Number,
    grupo_nodo: String,
    examenes: [{
        id: Number,
        indice: String,
        codigo: String,
        nombre: String,
        cAyuna: String,
        tipoExamen: String,
        grupoPrestacion: String,
    }]
})

mongoose.connect('mongodb://localhost:27017/test', {useNewUrlParser: true, useUnifiedTopology: true });

const obs = new PerformanceObserver((items) => {
    console.log(items.getEntries()[0].duration);
    performance.clearMarks();
});
obs.observe({ entryTypes: ['measure'] });

class Load extends Command {
    static get signature() {
        return `
    load
    { model : Name of the model }
    `
    }

    static get description() {

        return 'Shows inspirational quote from Paul Graham'
    }

    async handle(args, options) {
        switch (args.model) {
            case 'examen':
                let examenes = await Examen.query().with('requerimientos').fetch()
                performance.mark('X');
                examenes = examenes.toJSON()
                for (let examen of examenes) {
                    try {
                        let {created_at, updated_at, requerimientos, ...ex} = examen
                        const newOne = new mongoExamen(ex);
                        await newOne.save()
                    }
                    catch (e) {
                        console.log(e)
                    }
                }
                for (let examen of examenes) {
                    try {
                        let rqs = []
                        for (let rq of examen.requerimientos) {
                            let rqx = await mongoExamen.findOne({id: rq.requerimiento_id})
                            rqs.push(rqx)
                            //console.log(rqx)
                        }
                        //console.log(rqs)
                        await mongoExamen.updateOne({id: examen.id}, {$set: {requerimientos: rqs}})
                    }
                    catch (e) {
                        console.log(e)
                    }
                }
                performance.mark('Y');
                performance.measure('X to Y', 'X', 'Y');
                break
            case 'nodo':
                let nodos = await Nodo.query().with('examenes').fetch() //table('nodo').innerJoin('nodo_examen', 'nodo.id', 'nodo_examen.nodo_id').select('*')
                nodos = nodos.toJSON()
                //console.log(nodos[1].examenes)
                for (let nodo of nodos) {
                    try {
                        let {created_at, updated_at, examenes, ...nd} = nodo
                        const newOne = new mongoNodo(nd);
                        await newOne.save()
                    }
                    catch (e) {
                        console.log(e)
                    }
                }
                for (let nodo of nodos) {
                    try {
                        let exs = []
                        for (let ex of nodo.examenes) {
                            console.log(ex.id)
                            let exx = await mongoExamen.findOne({id: ex.id})
                            exs.push(exx)
                            //console.log(rqx)
                        }
                        //console.log(rqs)
                        await mongoNodo.updateOne({id: nodo.id}, {$set: {examenes: exs}})
                    }
                    catch (e) {
                        console.log(e)
                    }
                }
                //let x = await NodoExamen.query().where({nodo_id: 100}).fetch()
                break
        }
        Database.close()
        return true
    }
}

module.exports = Load
