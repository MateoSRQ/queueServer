'use strict'

const Model = use('Model')

class Nodo extends Model {
    static get table () {
        return 'nodo'
    }
    examenes() {
        // return this.belongsToMany('App/Models/Examen','nodo_id', 'examen_id', 'id', 'id')
        //     .pivotTable('nodo_examen')
        return this.manyThrough(
            'App/Models/NodoExamen',
            'examen',
            'id',
            'nodo_id'
        )
    }
    usuario() {
        return this.hasOne('App/Models/User', 'user_id', 'id')
    }
    paciente() {
        return this.hasOne('App/Models/Paciente', 'paciente_id', 'id')
    }
}

module.exports = Nodo
