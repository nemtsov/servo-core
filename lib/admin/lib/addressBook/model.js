import error from '_/error';

export default class addressBook {
  constructor (name, addresses) {
    if (typeof name !== 'string' || name.length === 0)
      throw new error.BadInputError('name is required and it has to be an unempty string');
    if (name.match(':'))
      throw new error.BadInputError('name should not contain \':\'');
    this.name = name;
    if (!Array.isArray(addresses))
      throw new error.BadInputError('addresses should be an array');
    this.addresses = addresses;
  }
}
