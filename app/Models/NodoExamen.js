'use strict'

const Model = use('Model')
const moment = require('moment')

class NodoExamen extends Model {
    static get table () {
        return 'nodo_examen'
    }
    examen() {
        return this.hasMany('App/Models/Examen', 'examen_id', 'id')
    }
}


module.exports = NodoExamen
