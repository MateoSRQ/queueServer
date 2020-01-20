'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route')

Route.get('api/x', 'ApiController.x')
Route.post('api/get', 'ApiController.get')

Route.post('api/login', 'ApiController.login')
Route.get('api/sedes', 'ApiController.sedes')
Route.get('api/nodos/:id', 'ApiController.nodos')
Route.get('api/nodos', 'ApiController.nodos')

Route.post('api/registro', 'ApiController.registro');
Route.post('api/checkin',  'ApiController.checkin');
Route.get('api/paciente', 'ApiController.paciente');