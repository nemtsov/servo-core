import error from '_/error';

module.exports = function twilio(accountSid, token, phone) {
  if (!accountSid) throw new error.BadInputError('twilio accountSid is required');
  if (!token) throw new error.BadInputError('twilio token is required');
  if (!phone) throw new error.BadInputError('twilio phone is required');
  this.accountSid = accountSid;
  this.token = token;
  this.phone = phone;
  this.type = 'twilio';
};
