import QuorumServiceInterface from 'Contracts/interfaces/QuorumService.interface'
import Env from '@ioc:Adonis/Core/Env'
import axios, { Method } from 'axios'

export default class QuorumService implements QuorumServiceInterface {
    private addresses: [string]
    private writeQuorum: [string]
    private readQuorum: [string]

    constructor() {
        this.addresses = Array() as [string]
        this.addresses.push(Env.get('NODE1'))
        this.addresses.push(Env.get('NODE2'))
        this.addresses.push(Env.get('NODE3'))
        this.addresses.push(Env.get('NODE4'))
        this.addresses.push(Env.get('NODE5'))

        this.writeQuorum = this.addresses.slice(0, 3) as [string]
        this.readQuorum = this.addresses.slice(3, 0) as [string]
    }

    public async get() {
        //return await this.getHealthyNodes()
      return await this.getNodeWithLatestKeyVersion('spells', await this.getHealthyNodes())

        // return await axios.get(Env.get('NODE1')).then(resp=> {
        //   return resp.data
        // })
        //return {hello: 'world'}
    }

    public async getValuesByKey(key: string) {
        let url = '/key/' + key
        let method: Method = 'get'

        return await (this.handleRequest(key, method, url))
    }

    public async insertValue(key: string, value: string) {
        let url = '/key/' + key + '/values'
        let method: Method = 'post'
        let data = { value: value }
        return await this.handleRequest(key, method, url, data)
    }

    public async updateValue(key: string, index: number, value: string) {
        let url = '/key/' + key + '/values/' + index
        let method: Method = 'put'
        let data = {
            value: value
        }
        return await this.handleRequest(key, method, url, data)
    }

    public async deleteValue(key: string, index: number) {
        let url = '/key/' + key + '/values/' + index
        let method: Method = 'delete'
        return await this.handleRequest(key, method, url)
    }

    private async handleRequest(key: string, method: Method, url: string, params?: object) {
        let quorum = await this.makeQuorum(method)

        let nodeWithLatestVersion = await this.getNodeWithLatestKeyVersion(key, quorum)
        params = params == undefined ? {} : params
        let response = await axios(
            {
                method: method,
                url: nodeWithLatestVersion + url,
                data: params
            }
        ).then(resp => {
            return resp.data
        })

        let sync = {}

        let indexToRemove = quorum.indexOf(nodeWithLatestVersion)
        quorum.splice(indexToRemove, 1)
        sync = await this.syncNodes(key, nodeWithLatestVersion, quorum)

        return {
            response: response,
            nodeWithLatestVersion: nodeWithLatestVersion,
            quorum: quorum,
            sync: sync
        }
    }

    private async syncNodes(key: string, nodeWithLatestVersion: string, nodes: [string]) {
        let latestValue = await axios.get(nodeWithLatestVersion + '/key/' + key).then(response => {
            return response.data[key]
        })


        let version = await axios.get(nodeWithLatestVersion + '/version/' + key).then(response => {
            return response.data.version
        })

        let res = {
            node: nodeWithLatestVersion,
            latest: latestValue,
            version: version,
            nodes: Array() as [object]
        }

        await Promise.all(nodes.map(node => axios({
            method: 'put',
            url: node + '/version/' + key,
            data: {
                values: latestValue,
                version: version
            }
        }).then(resp => res.nodes.push({
            node: node,
            response: resp.data
        }))))

        return res

    }

    private async getHealthyNodes() {
        let healthyNodes = Array() as [string]
        let nodes = this.addresses
        await Promise.all(nodes.map(node =>
            axios.get(node + '/health').then(response => {
                if (response.status == 200) healthyNodes.push(node)
            })
        ))
        return healthyNodes
    }

    private async makeQuorum(method: Method) {

        let healthyNodes = await this.getHealthyNodes()
        let numberOfNodes = healthyNodes.length
        let quorumSize = Math.trunc(numberOfNodes / 2) + 1
        let quorumMembers = Array() as [string]

        if (method != 'get') {
            quorumMembers = healthyNodes.slice(0, quorumSize) as [string]
            this.writeQuorum = quorumMembers
        } else {
            quorumMembers = healthyNodes.slice(quorumSize - 1) as [string]
            this.readQuorum = quorumMembers
        }

        return quorumMembers

    }

    private async makeRandomQuorum() {
        let healthyNodes = this.shuffleNodes(await this.getHealthyNodes())
        let numberOfNodes = healthyNodes.length
        let quorumSize = Math.trunc(numberOfNodes / 2) + 1
        let quorumMembers = Array() as [string]


        for (let i = 0; i < quorumSize; i++) {
            quorumMembers.push(healthyNodes[i])
        }

        return quorumMembers
    }

    private shuffleNodes(array: [string]): [string] {
        let currentIndex: number = array.length
        let randomIndex: number;

        // While there remain elements to shuffle...
        while (currentIndex != 0) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }

        return array;
    }

    private async getNodeWithLatestKeyVersion(key: string, nodes: [string]) {
        let max = 0;
        let nodeWithLatestVersion = ""
        await Promise.all(nodes.map(node =>
            axios.get(node + '/version/' + key).then(response => {
                if (response.data.version > max) {
                    max = response.data.version
                    nodeWithLatestVersion = node
                }

                console.log({
                    max: max,
                    currentMaxNode: nodeWithLatestVersion,
                    node: node,
                    nodeVersion: response.data.version
                })

            }
            )
        )
        )
        if (max == 0) nodeWithLatestVersion = nodes[0]
        return nodeWithLatestVersion
    }

}
