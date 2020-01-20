'use strict'

const Model = use('Model')

class Examen extends Model {
    static get table () {
        return 'examen'
    }
    requerimientos() {
        return this.hasMany('App/Models/Requerimiento', 'id', 'examen_id')
    }
    nodos() {
        return this.belongsToMany('App/Models/Nodo','examen_id', 'nodo_id', 'id', 'id')
            .pivotTable('nodo_examen')
    }
    pacientes() {
        return this.belongsToMany('App/Models/Paciente','examen_id', 'paciente_id', 'id', 'id')
            .pivotTable('paciente_examen')
            .withPivot(['tiempo_atendido', 'estado'])
    }
}

module.exports = Examen
