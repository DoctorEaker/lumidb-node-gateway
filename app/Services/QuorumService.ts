import QuorumServiceInterface from 'Contracts/interfaces/QuorumService.interface'
import Env from '@ioc:Adonis/Core/Env'
import axios, { Method } from 'axios'

export default class QuorumService implements QuorumServiceInterface {
    private addresses: [string]

    constructor() {
        this.addresses = Array() as [string];
        this.addresses.push(Env.get('NODE1'))
        this.addresses.push(Env.get('NODE2'))
        this.addresses.push(Env.get('NODE3'))
        this.addresses.push(Env.get('NODE4'))
        this.addresses.push(Env.get('NODE5'))
    }

    public async get() {
        //return await this.getHealthyNodes()
        return await this.getNodeWithLatestKeyVersion('spells', await this.makeQuorum())

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

  public async updateValue(key:string, index: number, value: string){
    let url = '/key/' + key + '/values/' + index
    let method: Method = 'put'
    let data = {
      value:value
    }
    return await this.handleRequest(key, method, url, data)
  }

  public async deleteValue(key:string, index:number){
    let url = '/key/' + key + '/values/' + index
    let method: Method = 'delete'
    return await this.handleRequest(key, method, url)
  }

    private async handleRequest(key: string, method: Method, url: string, params?: object) {
        let quorum = await this.makeQuorum()
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
        if (method != 'get') {
            let indexToRemove = quorum.indexOf(nodeWithLatestVersion)
            quorum.splice(indexToRemove, 1)
            await this.syncNodes(key, nodeWithLatestVersion, quorum)
        }
        return {
            response: response,
            nodeWithLatestVersion: nodeWithLatestVersion,
            quorum: quorum
        }
    }

    private async syncNodes(key: string, nodeWithLatestVersion: string, nodes: [string]) {
        let latestValue = await axios.get(nodeWithLatestVersion + '/key/' + key).then(response => {
            return response.data[key]
        })


        let version = await axios.get(nodeWithLatestVersion + '/version/' + key).then(response => {
            return response.data.version
        })


        await Promise.all(nodes.map(node => axios({
            method: 'put',
            url: node + '/version/' + key,
            data: {
                values: latestValue,
                version: version
            }
        }).then(resp => console.log(resp.data))))

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

    private async makeQuorum() {
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

            }
            )
        )
        )
        if (max == 0) nodeWithLatestVersion = nodes[0]
        return nodeWithLatestVersion
    }

}
