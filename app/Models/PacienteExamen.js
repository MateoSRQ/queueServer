'use strict'

const Model = use('Model')
const moment = require('moment')

class PacienteExamen extends Model {
    static get table () {
        return 'paciente_examen'
    }
    examen() {
        return this.belongsTo('App/Models/Examen', 'examen_id', 'id')
    }
    static boot () {
        super.boot()
		
        this.addHook('beforeUpdate', (pax) => {
			//console.log('pax');
			//console.log(pax);
            //userInstance.password = await Hash.make(userInstance.password)
            switch (pax.estado) {
                case 'P':
                    pax.inicio_atencion = moment().format('YYYY-MM-DD HH:mm:ss');
                    break;
                case 'T':
                    pax.fin_atencion = moment().format('YYYY-MM-DD HH:mm:ss');
                    var inicio   = moment(pax.inicio_atencion);
                    var fin      = moment(pax.fin_atencion);
                    pax.tiempo_atendido = moment.duration(fin.diff(inicio)).asSeconds();
                    break;
            }
			//console.log(pax);
        })
		
    }



}


module.exports = PacienteExamen
