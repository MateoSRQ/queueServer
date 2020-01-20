'use strict'
const Database = use('Database')
const {Command} = require('@adonisjs/ace')
const axios = require('axios')
const faker = require('faker')
const { PerformanceObserver, performance } = require('perf_hooks')
const mongoose = require('mongoose')
var _ = require('lodash')

async function* asyncGenerator2() {
    var end = parseInt(10);
    var i = 0
    while (i < end) {
        yield i++;
    }
}

const obs = new PerformanceObserver((items) => {
    console.log(items.getEntries()[0].duration);
    performance.clearMarks();
});
obs.observe({ entryTypes: ['measure'] });

class Migraine extends Command {
    static get signature() {
        return 'migraine'
    }


    static get description() {
        return 'Tell something helpful about this command'
    }

    async handle(args, options) {
        //this.info('Dummy implementation for migraine command')
        let count = 100

        let tests = 40

        performance.mark('X');
        const results = await Database.table('examen').select('*') //.fetch() //.where({tipoExamen: 'Prestacion Presencial'})
        performance.mark('Y');
        performance.measure('X to Y for ' + count, 'X', 'Y');
        performance.mark('A');

        for (let i = 0; i < count; i++) {
            let examenes = []
            let rand = Math.floor(Math.random()*(tests - 10) + 10)

            for (let j=0; j<rand; j++) {
                examenes.push(results[Math.floor(Math.random()*(results.length - 1))].codigo)
            }
            try {
                let ticket = i.toString()
                ticket = ticket.padStart(5, '0')
                //console.log(examenes)
                await axios({
                    url: 'http://127.0.0.1:3333/api/get',
                    method: 'POST',
                    data: {
                        nombre: faker.name.findName(),
                        examenes: _.uniq(examenes),
                        ticket: 'A' + ticket,
                        indice: Math.floor(Math.random()*(100))
                    }
                })
            }
            catch (e) {
                console.log(e.message)
            }
        }
        performance.mark('B');
        performance.measure('A to B for ' + count, 'A', 'B');
        Database.close()
    }
}

module.exports = Migraine
