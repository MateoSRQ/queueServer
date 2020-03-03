'use strict'
const LoggerApi = use('Logger')
LoggerApi.level = 'debug'
const transport = 'console'
const moment = require('moment')
const uuidv4 = require('uuid/v4')
const Test = use('App/Models/Test')
const Examen = use('App/Models/Examen')
const Paciente = use('App/Models/Paciente')
const PacienteExamen = use('App/Models/PacienteExamen')
const {performance, PerformanceObserver} = require('perf_hooks');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const pack = require('msgpack-lite');

const faker = require('faker');
const _ = require('lodash');
const jsonpack = require('jsonpack');


const obs = new PerformanceObserver((list) => {
    const entry = list.getEntries()[0]
    console.log(`Time for ('${entry.name}')`, entry.duration);
});
obs.observe({entryTypes: ['measure'], buffered: false});

mongoose.connect('mongodb://localhost:27017/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    keepAlive: true,
    keepAliveInitialDelay: 300000,
    poolSize: 20
});
const mongoExamen = mongoose.model('examen', {
    id: Number,
    indice: String,
    codigo: String,
    nombre: String,
    cAyuna: String,
    tipoExamen: String,
    grupoPrestacion: String,
    nrequerimientos: Number,
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
const mongoPaciente = mongoose.model('paciente', {
    ticket: String,
    sede: String,
    dni: String,
    nombre: String,
    sexo: String,
    edad: Number,
    celular: String,
    correo: String,
    dtCita: String,
    dtCheckin: String,
    episodios: [{
        codigoEpisodio: String,
        titular: String,
        unidad: String,
        contrata: String,
        puesto: String,
        Protocolo: String,
        TipoExamen: String,
        TiempoTeorico: Number,
        pruebas: Array,
    }]


});
const mongoUser = mongoose.model('user', {
    id: Number,
    username: String,
    password: String,
    token: String,
    nodos: Array,
    info: Array
});
const mongoSede = mongoose.model('sede', {
    id: Number,
    nombre: String,
    descripcion: String,
})
const mongoNodo = mongoose.model('nodo', {
    id: Number,
    nombre: String,
    sede_id: Number,
    user_id: Number,
    paciente_id: Number,
    area: String,
    color: String,
    codigo: String,
    estado: String,
    tiempo_atencion: Number,
    tiempo_llamada: Number,
    tiempo_espera: Number,
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
        nrequerimientos: Number,
        requerimientos: [{
            id: Number,
            indice: String,
            codigo: String,
            nombre: String,
            cAyuna: String,
            tipoExamen: String,
            grupoPrestacion: String,
        }]
    }],
    pacientes: Array,
    cola: Array,
});

class ApiController {

    async get({params, request, response, view, auth, session}) {
        try {
            const new_pac = request.post()
            let examen_ids = []
            let examenes = []
            for (let examen of new_pac.examenes) {
                let ex = await mongoExamen.findOne({codigo: examen})
                examen_ids.push(ex.id)
                examenes.push(ex)
            }
            let new_examenes = []

            for (let examen of examenes) {
                let rqs = _.filter(examen.requerimientos, function (o) {
                    return _.includes(examen_ids, o.id)
                })
                let nexamen = examen
                nexamen.requerimientos = rqs
                nexamen.nombre = '_' + nexamen.nombre
                nexamen.nrequerimientos = rqs.length
                new_examenes.push(nexamen)
            }
            //let {examenes, ...rest} = request.post()
            console.log(new_pac)
            new_pac.examenes = new_examenes
            new_pac.nombre = '_' + new_pac.nombre
            console.log(new_pac)
            const newOne = new mongoPaciente(new_pac);

            await newOne.save()
            //console.log(request.post())
            return true
        } catch (e) {
            console.log(e)
        }
    }

    async sedes({params, request, response, view, auth, session}) {
        performance.mark('Beginning sanity check');
        try {

            //let sedes  = await mongoSede.find()
            let sedes = await mongoSede.aggregate([
                {
                    $lookup: {
                        from: "nodos",
                        localField: "id",
                        foreignField: "sede_id",
                        as: "nodos"
                    }
                },
                {
                    $lookup: {
                        from: "pacientes",
                        localField: "id",
                        foreignField: "sede_id",
                        as: "pacientes"
                    }
                },
                {
                    $addFields: {
                        tiempo_espera: {$avg: "$nodos.tiempo_espera"},
                        tiempo_llamada: {$avg: "$nodos.tiempo_llamada"},
                        tiempo_atencion: {$avg: "$nodos.tiempo_atencion"},
                        max_paciente_espera: {$max: "$pacientes.tiempo_espera"},
                        max_nodo_espera: {$max: "$nodos.tiempo_espera"}
                    }
                },
                {
                    $project: {
                        id: 1,
                        tiempo_espera: 1,
                        tiempo_llamada: 1,
                        tiempo_atencion: 1,
                        max_paciente_espera: 1,
                        max_nodo_espera: 1,
                        nombre: 1,
                    }
                }
            ])


            let _sedes = []
            for (let i = 0; i < sedes.length; i++) {
                let n = await mongoSede.aggregate([
                    {$match: {id: sedes[i].id}},
                    {
                        $lookup: {
                            from: "nodos",
                            localField: "id",
                            foreignField: "sede_id",
                            as: "nodos"
                        }
                    },

                    {
                        $unwind: "$nodos",
                    },

                    {
                        $group: {
                            _id: "$nodos.estado",
                            numero: {$sum: 1},
                            // tiempo_espera:   { $avg: "$nodos.tiempo_espera"},
                            // tiempo_llamada:  { $avg: "$nodos.tiempo_llamada"},
                            // tiempo_atencion: { $avg: "$nodos.tiempo_atencion"}
                        },

                    }

                ])

                let p = await mongoSede.aggregate([
                    {$match: {id: sedes[i].id}},


                    {
                        $lookup: {
                            from: "pacientes",
                            localField: "id",
                            foreignField: "sede_id",
                            as: "pacientes"
                        }
                    },

                    {
                        $unwind: "$pacientes",
                    },

                    {
                        $group: {
                            _id: "$pacientes.estado",
                            numero: {$sum: 1},
                            max_espera: {$max: "$pacientes.tiempo_espera"}
                        },

                    }

                ])
                _sedes.push({
                    id: sedes[i].id,
                    nombre: sedes[i].nombre,
                    tiempo_espera: sedes[i].tiempo_espera,
                    tiempo_atencion: sedes[i].tiempo_atencion,
                    tiempo_llamada: sedes[i].tiempo_llamada,
                    max_paciente_espera: sedes[i].max_paciente_espera,
                    max_nodo_espera: sedes[i].max_nodo_espera,
                    nodos: n,
                    pacientes: p
                })
            }
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');

            return response.ok(_sedes)


            // await mongoPaciente.updateMany(
            //     { indice: { $gte: 50 } },
            //     {
            //         sede_id: 2
            //     }
            // )

        } catch (e) {
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            console.log(e)
            return response.internalServerError(e)
        }
    }

    /*
    async nodos({params, request, response, view, auth, session}) {
        console.log(params.id)
        performance.mark('Beginning sanity check');
        try {

            //let sedes  = await mongoSede.find()
            // let nodos = await mongoNodo.find(
            //     {sede_id: 1},
            //     {
            //         nombre: 1,
            //         npacientes: {$count: "$pacientes"}
            //     }
            // )
            let nodos = await mongoNodo.aggregate([
                {$match: {sede_id: 2}},
                {
                    $group: {
                        _id: "$grupo_nodo",
                        numero: {$sum: 1},
                        nodos: {
                            $addToSet: {
                                nombre: "$codigo",
                                paciente_id: "$paciente_id",
                                estado: "$estado",
                                tiempo_atencion: "$tiempo_atencion",
                                tiempo_llamada: "$tiempo_llamada",
                                tiempo_espera: "$tiempo_espera",
                                pacientesize: {$size: "$pacientes"},
                                pacientes: "$pacientes.nombre"
                            }
                        }
                    }

                },

            ])
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');

            return response.ok(nodos)


            // await mongoPaciente.updateMany(
            //     { indice: { $gte: 50 } },
            //     {
            //         sede_id: 2
            //     }
            // )

        } catch (e) {
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            console.log(e)
            return response.internalServerError(e)
        }
    }
    */
    async login({params, request, response, view, auth, session}) {
        try {
            const new_login = request.post()

            const aggregate = mongoUser.aggregate([{
                '$lookup': {
                    from: 'nodos',
                    localField: 'nodos',
                    foreignField: 'id',
                    as: 'info'
                }
            }]);

            let user = await mongoUser.findOne(
                {
                    username: new_login.username,
                    password: new_login.password
                }
            )
            if (user) {
                let token = jwt.sign({username: user.username}, user.password, {expiresIn: '4h'});
                await mongoUser.updateOne({token: token});
                return response.accepted(user)
            } else {
                return response.unauthorized('not logged')
            }
        } catch (e) {
            console.log(e)
            return response.unauthorized('not logged')

        }
    }

    async x({params, request, response, view, auth, session}) {
        performance.mark('Beginning sanity check');

        try {
            let nodos = await mongoNodo.find();
            for (let nodo of nodos) {
                await mongoNodo.updateOne({_id: nodo._id}, {
                    estado: 'N'
                })
            }
            // let pacientes = await mongoPaciente.find({});
            //
            // for (let paciente of pacientes) {
            //     console.log(paciente.id);
            //     let random1 = Math.round(Math.random() * 3600 - 7200);
            //     let random2 = Math.round(Math.random() * 3600 - 7200);
            //     let now1 = moment();
            //     let now2 = moment()
            //     now1.add(random1, "seconds");
            //     now2.add(random2, "seconds");
            //     now1 = now1.format('YYYYMMDDHHmmss');
            //     now2 = now2.format('YYYYMMDDHHmmss');
            //     //return (Math.abs(parseInt(now1) - parseInt(now2)))
            //
            //     await mongoPaciente.updateOne({_id: paciente._id}, {$set: {
            //         estado: 'N',
            //         dtCita: parseInt(now1),
            //         dtCheckin: parseInt(now2),
            //         indice: -(Math.abs(parseInt(now1) - parseInt(now2)))
            //     }})
            // }
        } catch (e) {
            console.log(e)
        }
        // let pos = ['A', 'P', 'E', 'X', 'C']
        //
        //
        // try {
        //   // let n = await mongoNodo.aggregate([
        //   //     //{ $match: { sede_id: 1} },
        //   //     {
        //   //         $group: {
        //   //             _id: {grupo_nodo: "$grupo_nodo"},
        //   //             numero: {$sum: 1},
        //   //             tiempo_atencion: {$avg: "$tiempo_atencion"},
        //   //             nodos: { $addToSet: {
        //   //                 codigo: "$codigo"
        //   //             }}
        //   //         },
        //   //
        //   //     }
        //   // ])
        //   performance.mark('Ending sanity check');
        //   performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
        //   // return response.ok(n)
        //   // let pacs = await mongoPaciente.find()
        //   // for (let pac of pacs) {
        //   //     console.log(pac.id)
        //   //     let rnd1 = Math.random()
        //   //     let rnd2 = Math.random()
        //   //     let rnd3 = Math.random()
        //   //     let rnd4 = Math.random()
        //   //     await  mongoPaciente.updateOne(
        //   //         { _id: pac.id},
        //   //         {
        //   //             estado: pos[Math.round(rnd1*3)],
        //   //             tiempo_espera: Math.round(rnd2*100),
        //   //             tiempo_atencion: Math.round(rnd3*100),
        //   //             tiempo_llamada: Math.round(rnd4*100),
        //   //         }
        //   //     )
        //   // }
        //   let nodos = await mongoNodo.find()
        //   for (let nodo of nodos) {
        //     console.log(nodo.id)
        //     let rnd = Math.random() + 1
        //     let pacs = await mongoPaciente.aggregate([{$sample: {size: Math.round(rnd * 10) + 4}}]
        //     )
        //     let rnd1 = Math.random()
        //     let rnd2 = Math.random()
        //     let rnd3 = Math.random()
        //     let rnd4 = Math.random()
        //     await mongoNodo.updateOne(
        //       {_id: nodo._id},
        //       {
        //         // estado: pos[Math.round(rnd1*3)],
        //         // tiempo_atencion: Math.round(rnd2*100),
        //         // tiempo_llamada: Math.round(rnd3*100),
        //         // tiempo_espera: Math.round(rnd4*100),
        //         pacientes: pacs
        //
        //       }
        //     )
        //   }
        // }
        // catch (e) {
        //   performance.mark('Ending sanity check');
        //   performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
        //   console.log(e)
        // }
        // performance.mark('Ending sanity check');
        // performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
        //

    }

    async nodos({params, request, response, view, auth, session}) {
        try {
            let query = request.get();
            let {size = 10, page = 1} = query;
            let total = await mongoNodo.countDocuments();
            let nodos = await mongoNodo.find({}, {
                _id: 1,
                id: 1,
                sede_id: 1,
                nombre: 1,
                area: 1,
                color: 1,
                codigo: 1,
                estado: 1,
                grupo_nodo: 1
            }).limit(size).skip((page - 1) * size);

            let result = {
                page: parseInt(page),
                size: size,
                total: total,
                pages: Math.ceil(total / size),
                data: nodos
            };

            return response.ok(result);
        } catch (e) {
            console.log(e);
            return response.badRequest(e);
        }
    }

    async examenes({params, request, response, view, auth, session}) {
        try {
            let query = request.get();
            let examenes = await mongoExamen.find({tipoExamen: "Prestacion Presencial"}, {requerimientos: 0});
            console.log(examenes.length)

            return response.ok(examenes);
        } catch (e) {
            console.log(e);
            return response.badRequest(e);
        }
    }

    async fullNodos({params, request, response, view, auth, session}) {
        try {
            let query = request.get();
            console.log(query.sede);
            let result = []
            let nodos = await mongoNodo.find({sede_id: query.sede}, {pacientes: 0, cola: 0});
            return response.ok(nodos);

        } catch (e) {
            console.log(e);
            return response.badRequest(e);
        }
    }

    async changeNodeStatus({params, request, response, view, auth, session}) {
        try {
            let query = request.post();
            if (query.id && query.codigo) {
                performance.mark('Beginning sanity check');
                let nodo = await mongoNodo.findOne({_id: query.id}, {pacientes: 0, cola: 0});
                if (nodo) {
                    let nodo_examenes = nodo.examenes;
                    let examen = _.remove(nodo_examenes, function (o) {
                        return o.codigo == query.codigo
                    });

                    if (!_.isEmpty(examen)) {
                        await mongoNodo.updateOne({_id: query.id}, {
                            examenes: nodo_examenes
                        })
                        //let nodos = await mongoNodo.find({sede_id: nodo.sede_id}, {pacientes: 0, cola: 0});
                        let nodos = await mongoNodo.findOne({
                            _id: query.id,
                            sede_id: nodo.sede_id
                        }, {pacientes: 0, cola: 0});
                        nodos = jsonpack.pack(JSON.parse(JSON.stringify(nodos)));
                        performance.mark('Ending sanity check');
                        performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
                        return response.ok(nodos);
                    } else {
                        examen = await mongoExamen.findOne({codigo: query.codigo});
                        if (examen) {
                            await mongoNodo.updateOne(
                                {_id: query.id},
                                {$push: {examenes: examen}}
                            );

                            //let nodos = await mongoNodo.find({sede_id: nodo.sede_id}, {pacientes: 0, cola: 0});
                            let nodos = await mongoNodo.findOne({
                                _id: query.id,
                                sede_id: nodo.sede_id
                            }, {pacientes: 0, cola: 0});
                            nodos = jsonpack.pack(JSON.parse(JSON.stringify(nodos)));
                            performance.mark('Ending sanity check');
                            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
                            return response.ok(nodos);

                        } else {
                            return response.badRequest(null);
                        }
                    }
                } else {
                    return response.badRequest(null);
                }
            } else {
                return response.badRequest(null);
            }

        } catch (e) {
            console.log(e);
            return response.badRequest(e);
        }
    }

    async nodo({params, request, response, view, auth, session}) {
        try {
            let query = params;

            let result = await mongoNodo.findOne({_id: query.id});
            return response.ok(result);
        } catch (e) {
            console.log(e);
            return response.badRequest(e);
        }
    }

    async registro({params, request, response, view, auth, session}) {
        try {
            let query = request.post();
            performance.mark('Beginning sanity check');

            let object = _.clone(query)
            let allPruebas = [];
            object.dtCita = moment(object.dtCita).format('YYYYMMDDhhmmss');
            object.dtCheckin = moment(object.dtCheckin).format('YYYYMMDDhhmmss');
            for (let episodio in object.episodios) {
                let pruebas = [];

                for (let prueba of object.episodios[episodio].pruebas) {
                    let _prueba = await mongoExamen.findOne({codigo: prueba});
                    if (_prueba) {
                        pruebas.push(_prueba);
                    }
                }
                allPruebas = _.uniq(_.concat(allPruebas, pruebas));
                object.episodios[episodio].pruebas = pruebas;
            }
            object.allPruebas = allPruebas;
            await mongoPaciente.create(object);
            performance.mark('Ending sanity check');
            performance.measure('Check:', 'Beginning sanity check', 'Ending sanity check');

            return response.ok(object);
        } catch (e) {
            console.log(e);
            return response.badRequest(e);
        }
    }

    /*
    async registro({params, request, response, view, auth, session}) {
        const uuid = uuidv4()
        LoggerApi.transport(transport).debug(moment().format('YYYY-MM-DD hh:mm:ss:SSS') + ' - ' + 'ApiController.registro start ' + uuid)
        try {
            var query = request.post()
            console.log(query)
            var data = {
                hora_cita: moment(query.dtCita, 'YYYY-MM-DD HH:mm:ss').format('X'),
                hora_inicio: moment(query.dtCheckin, 'YYYY-MM-DD HH:mm:ss').format('X'),
                indice: 0, //-Math.abs((moment(query.dtCita,'YYYY-MM-DD HH:mm:ss' ).format('X') - moment(query.dtCheckin,'YYYY-MM-DD HH:mm:ss' ).format('X'))*.5),
                nombre: query.nombre,
                ticket: query.ticket,
                estado: 'E',
                dni: query.dni,
                sede: query.sede,
                pruebas: query.pruebas
            }
            console.log(query)
            //Event.emit('queue', JSON.stringify({type: 'registro', data: data }))
            // LoggerApi.transport(transport).debug(moment().format('YYYY-MM-DD hh:mm:ss:SSS') + ' - ' + 'ApiController.registro end ' + uuid)
            // return true
        } catch (e) {
            // LoggerApi.transport('file').warning(moment().format('YYYY-MM-DD hh:mm:ss:SSS') + ' - ' + 'ApiController.registro error ' + uuid)
            // LoggerApi.transport('file').warning(e.message)
            // return false
        }
    }
    */
    async checkin({params, request, response, view, auth, session}) {
        try {
            var query = request.post();
            // elimina lo anterior (dev)
            //await mongoNodo.updateMany({}, {$unset: { cola: "" }});
            await mongoNodo.updateMany({}, {cola: []});

            // let paciente = await mongoPaciente.findOne({ticket: query.ticket});
            let pacientes = await mongoPaciente.find().limit(100);

            // para cada paciente
            for (let paciente of pacientes) {
                let t0 = performance.now();
                //console.log(paciente.ticket + ' ' + paciente.id);
                let pexamenes = _.map(paciente.examenes, item => item.id);
                // para cada examen del paciente
                for (let examen of pexamenes) {
                    let nodo = await mongoNodo.aggregate([
                        {
                            $match: {"examenes.id": examen}
                        },

                        {
                            $project: {
                                id: 1,
                                codigo: 1,
                                "examenes.id": 1,
                                "cola": 1,
                                "nexamenes": {$size: "$examenes"},
                                "ncola": {$size: "$cola"}
                                //{ "$ifNull": [ "$myFieldArray", [] ] }
                            }
                        },
                        {$sort: {ncola: 1}},
                        {$limit: 1}
                    ])
                    if (nodo.length) {
                        nodo = nodo[0];
                        let nexamenes = _.map(nodo.examenes, item => item.id);
                        let intersect = _.intersection(pexamenes, nexamenes);
                        if (intersect.length > 0) {
                            await mongoNodo.updateOne({id: nodo.id}, {
                                $push: {
                                    cola: {
                                        paciente_id: paciente.id,
                                        ticket: paciente.ticket,
                                        estado: 'E',
                                        indice: paciente.indice,
                                        pruebas: intersect
                                    }
                                }
                            });
                        }
                        let result = _.difference(pexamenes, intersect);
                        pexamenes = result;
                    }
                }
                let t1 = performance.now();
                console.log("Time " + (t1 - t0) + " ms.")
            }

            // return nodos;


        } catch (e) {
            console.log(e);
        }
    }

    async paciente({params, request, response, view, auth, session}) {
        try {
            var query = request.get();
            performance.mark('Beginning sanity check');
            let results = await mongoNodo.find({
                "cola.ticket": query.ticket,
                estado: 'E'
            }, {_id: 1, id: 1, nombre: 1, codigo: 1, cola: 1});
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            return results;
        } catch (e) {
        }
    }

    async fullNodos_v2({params, request, response, view, auth, session}) {
        try {
            performance.mark('Beginning sanity check');
            let query = request.get();
            let result = []
            let nodos = await mongoNodo.find({sede_id: query.sede}, {pacientes: 0, cola: 0}).lean();
            let examenes = await mongoExamen.find({});

            let _examenes = {};
            for (let examen in examenes) {
                _examenes[examenes[examen].codigo] = examenes[examen];
            }
            //return response.ok(_examenes);

            //let _nodos =  nodos.toObject() //_.clone(nodos);
            for (let nodo in nodos) {
                for (let ex of nodos[nodo].examenes) {
                    if (_examenes[ex.codigo]) {
                        //console.log('-' + _examenes[ex.codigo]);
                        //console.log(_nodos[nodo])
                        nodos[nodo][ex.codigo] = true
                    }
                    delete nodos[nodo].examenes
                }
            }
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');

            return response.ok(nodos);

        } catch (e) {
            console.log(e);
            return response.badRequest(e);
        }
    }

    async changeNodeStatus_v2({params, request, response, view, auth, session}) {
        try {
            let query = request.post();
            if (query.id && query.codigo) {
                performance.mark('Beginning sanity check');
                let nodo = await mongoNodo.findOne({_id: query.id}, {pacientes: 0, cola: 0});
                if (nodo) {
                    let nodo_examenes = nodo.examenes;
                    let examen = _.remove(nodo_examenes, function (o) {
                        return o.codigo == query.codigo
                    });

                    if (!_.isEmpty(examen)) {
                        await mongoNodo.updateOne({_id: query.id}, {
                            examenes: nodo_examenes
                        })
                        //let nodos = await mongoNodo.find({sede_id: nodo.sede_id}, {pacientes: 0, cola: 0});
                        let nodos = await mongoNodo.findOne({
                            _id: query.id,
                            sede_id: nodo.sede_id
                        }, {pacientes: 0, cola: 0});
                        nodos = jsonpack.pack(JSON.parse(JSON.stringify(nodos)));
                        performance.mark('Ending sanity check');
                        performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
                        return response.ok(nodos);
                    } else {
                        examen = await mongoExamen.findOne({codigo: query.codigo});
                        if (examen) {
                            await mongoNodo.updateOne(
                                {_id: query.id},
                                {$push: {examenes: examen}}
                            );

                            //let nodos = await mongoNodo.find({sede_id: nodo.sede_id}, {pacientes: 0, cola: 0});
                            let nodos = await mongoNodo.findOne({
                                _id: query.id,
                                sede_id: nodo.sede_id
                            }, {pacientes: 0, cola: 0});
                            nodos = jsonpack.pack(JSON.parse(JSON.stringify(nodos)));
                            performance.mark('Ending sanity check');
                            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
                            return response.ok(nodos);

                        } else {
                            return response.badRequest(null);
                        }
                    }
                } else {
                    return response.badRequest(null);
                }
            } else {
                return response.badRequest(null);
            }

        } catch (e) {
            console.log(e);
            return response.badRequest(e);
        }
    }

    async examenes_v2({params, request, response, view, auth, session}) {
        performance.mark('Beginning sanity check');
        try {
            let examenes = await mongoExamen.find(
                {
                    tipoExamen: 'Prestacion Presencial'
                },
                {
                    requerimientos: 0
                }
            ).lean();
            examenes = _.groupBy(examenes, (examen) => { return examen.codigo.substr(0, 3)})
//            sedes = jsonpack.pack(JSON.parse(JSON.stringify(sedes)));
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            return response.ok(examenes)
        }
        catch (e) {
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            console.log(e)
            return response.internalServerError(e)
        }
    }

    async sedes_v2({params, request, response, view, auth, session}) {
        performance.mark('Beginning sanity check');
        try {
            let sedes = await mongoSede.find().lean();
            for (let sede in sedes) {
                let nodos = await mongoNodo.find(
                    {sede_id: sedes[sede].id},
                    {_id: 1, codigo: 1, grupo_nodo: 1}
                    ).lean();
                sedes[sede].nodos = JSON.parse(JSON.stringify(_.groupBy(nodos, 'grupo_nodo')));



                // sedes[sede].nodos = await mongoNodo.find(
                //     {sede_id: sedes[sede].id},
                //     {_id: 1, codigo: 1, grupo_nodo: 1}
                //     ).lean();
            }
            sedes = jsonpack.pack(JSON.parse(JSON.stringify(sedes)));
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            return response.ok(sedes)
        } catch (e) {
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            console.log(e)
            return response.internalServerError(e)
        }
    }

    async sedes_v3({params, request, response, view, auth, session}) {
        performance.mark('Beginning sanity check');
        try {
            let sedes = await mongoSede.find().lean();
            sedes = jsonpack.pack(JSON.parse(JSON.stringify(sedes)));
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            return response.ok(sedes)
        } catch (e) {
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            console.log(e)
            return response.internalServerError(e)
        }
    }

    async saveSede_v3({params, request, response, view, auth, session}) {
        performance.mark('Beginning sanity check');
        try {
            let data = request.post();
            console.log(data)
            let model =  new mongoSede(data);
            await model.save();
            let sede = await mongoSede.findOne({_id: model._id}).lean();
            // let sedes = await mongoSede.find().lean();
            // sedes = jsonpack.pack(JSON.parse(JSON.stringify(sedes)));
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            return response.ok(sede)
        } catch (e) {
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            console.log(e)
            return response.internalServerError(e)
        }
    }

    async sede_v3({params, request, response, view, auth, session}) {
        performance.mark('Beginning sanity check');
        try {
            let _id = params.id;
            let sede = await mongoSede.findOne({_id: _id}).lean();
            let nodos = await mongoNodo.find(
                {sede_id: sede.id},
                {_id: 1, codigo: 1, grupo_nodo: 1, estado: 1, id: 1 }
            ).lean();
            sede.nodos = JSON.parse(JSON.stringify(_.groupBy(nodos, 'grupo_nodo')));
            sede = jsonpack.pack(JSON.parse(JSON.stringify(sede)));
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            return response.ok(sede)
        } catch (e) {
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            console.log(e)
            return response.internalServerError(e)
        }
    }

    async examenes_v3({params, request, response, view, auth, session}) {
        performance.mark('Beginning sanity check');
        try {
            let examenes = await mongoExamen.find(
                {
                    tipoExamen: 'Prestacion Presencial'
                },
                {
                    requerimientos: 0
                }
            ).lean();
            examenes = _.groupBy(examenes, (examen) => { return examen.codigo.substr(0, 3)})
//            sedes = jsonpack.pack(JSON.parse(JSON.stringify(sedes)));
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            //examenes = jsonpack.pack(JSON.parse(JSON.stringify(examenes)));
            return response.ok(examenes)
        }
        catch (e) {
            performance.mark('Ending sanity check');
            performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');
            console.log(e)
            return response.internalServerError(e)
        }
    }

    /*
      async nodos({params, request, response, view, auth, session}) {
          performance.mark('Beginning sanity check');
          try {
              var query = request.post();

              let results = await mongoNodo.find({
                  sede_id: 1,
                  //"cola.ticket": query.ticket,
                  //estado: 'E'
              }, {_id: 1, id: 1, estado: 1, nombre: 1, codigo: 1, cola: 1});
              performance.mark('Ending sanity check');
              performance.mark('Beginning filtering check');
              for (let index in results) {
                  results[index].cola = _.filter(results[index].cola, item => 'E');
                  results[index].cola = _.orderBy(results[index].cola, ['indice'], ['desc']);
              }
              performance.mark('Ending filtering check');
              performance.mark('Ending sanity check');
              performance.measure('Filter validation', 'Beginning filtering check', 'Ending filtering check');
              performance.measure('Inputs validation', 'Beginning sanity check', 'Ending sanity check');

              response.ok(results);
          }
          catch(e) {
              console.log(e);
              response.internalServerError(e);
          }
      }
  */
}

module.exports = ApiController
