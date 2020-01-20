'use strict'

const Model = use('Model')

class Sede extends Model {
    static get table () {
        return 'sede'
    }
}

module.exports = Sede
