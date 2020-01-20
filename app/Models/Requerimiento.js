'use strict'

const Model = use('Model')

class Requerimiento extends Model {
    static get table () {
        return 'requerimiento'
    }
    examen() {
        return this.hasOne('App/Models/Examen', 'requerimiento_id', 'id')
    }
}

module.exports = Requerimiento
