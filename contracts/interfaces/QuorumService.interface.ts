export default interface QuorumServiceInterface{
  get():object
  // get():object
  // getKeys():object
  // getValue(key:string, index:number):object
  getValuesByKey(key:string):object
  insertValue(key:string, value:string):object
  // renameKey(oldKey:string, newKey:string):object
  updateValue(key:string, index:number, value:string):object
  // deleteKey(key:string):object
  deleteValue(key:string,index:number):object
  // getVersion():object
  // setVersion(version:number):object
}
