import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import QuorumService from 'App/Services/QuorumService'

export default class AppProvider {
  constructor(protected app: ApplicationContract) {}

  public register() {
    // Register your own bindings
    this.app.container.singleton('LumiDB/QuorumService', () => new QuorumService)
  }

  public async boot() {
    // IoC container is ready
  }

  public async ready() {
    // App is ready
  }

  public async shutdown() {
    // Cleanup, since app is going down
  }
}
