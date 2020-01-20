'use strict'

const Model = use('Model')

class Paciente extends Model {
    static get table () {
        return 'paciente'
    }
}

module.exports = Paciente
