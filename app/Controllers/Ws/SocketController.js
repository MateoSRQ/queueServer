'use strict'

class SocketController {
    constructor({socket, request}) {
        this.socket = socket
        this.request = request

    }

    async onMessage(message) {
        console.log('x')
        console.log(this.socket)
        console.log(this.socket.id)
        console.log(message)
        //this.socket.broadcastToAll('message', message)

    }

    onLogin(message) {
        console.log('y')
        console.log(message)
        console.log(this.socket.id)
        this.socket.emitTo('message', 'yeah', [this.socket.id])
    }
}

module.exports = SocketController
