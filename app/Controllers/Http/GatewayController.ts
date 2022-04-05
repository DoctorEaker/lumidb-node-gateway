import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import QuorumService from '@ioc:LumiDB/QuorumService'

export default class GatewayController {
  public async index({}: HttpContextContract) {

    return await QuorumService.get()
  }

  public async create({}: HttpContextContract) {}

  public async store({}: HttpContextContract) {}

  public async show({params}: HttpContextContract) {
    let key = params.id
    return await QuorumService.getValuesByKey(key)
  }

  public async edit({params, request}: HttpContextContract) {
    let key = params.id
    let value = request.all().value
    return await QuorumService.insertValue(key, value)
  }

  public async update({params, request}: HttpContextContract) {
    let key = params.id
    let value = request.all().value
    let index = request.all().index
    return await QuorumService.updateValue(key,index,value)
  }

  public async destroy({params, request}: HttpContextContract) {
    let key = params.id
    let index = request.all().index

    return await QuorumService.deleteValue(key, index)
  }
}
