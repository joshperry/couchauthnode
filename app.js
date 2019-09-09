const net = require('net'),
      carrier = require('carrier')

const dbuser = process.env.COUCH_USER,
      dbpass = process.env.COUCH_PASSWORD,
      dbhost = process.env.COUCH_HOST,
      db = require('nano')(`http://${dbuser}:${dbpass}@${dbhost}:5984/mail`)

const postfixHandler = (serviceName, getHandler = () => Promise.reject()) => {
  let clientId = 0

  return (client) => {
    clientId += 1
    const service = `${serviceName}(${clientId})`
    console.log(`${service}: Postfix client connected`)

    client.on('end', () => console.log(`${service}: Postfix client disconnected`))

    carrier.carry(client, null, 'ascii')
      .on('line', async (line) => {
        // Make sure this is a get request and that it has a parameter
        const tokens = line.toLowerCase().split(' ')
        if(tokens.length === 2 && tokens[0] === 'get') {
          // Unescape the parameter value
          const reqval = unescape(tokens[1])
          console.log(`${service}: Got get request ${reqval}`)

          // Have the subclass do its lookup
          try {
            const respval = await getHandler(reqval)
            console.log(`${service}: responding with ${respval}`)
            client.write(`200 ${respval}\n`)
          } catch(err) {
            console.log(`${service}: responding with Not Found`)
            client.write('500 Not Found\n')
          }
        } else {
          console.log(`${service}: got an unknown request line (${line})`)
          client.write('400 Unknown or unsupported request type\n')
        }
      })
  }
}

const domainHandler = () => postfixHandler('domain', (domain) => db.get(domain).then(() => 'OK'))
const mailboxHandler = () => postfixHandler('mailbox', (username) => db.get(username).then(() => username))
const aliasHandler = () => postfixHandler('alias', (alias) => db.get(`alias-${alias}`).then((body) => body.target))

const dovecotAuthHandler = () => {
  // Dovecot makes one request per connection
  const CMD_HELLO = 'H'
  const CMD_LOOKUP = 'L'

  const dovecotEscape = (str) => str
    .replace(/\x01/g, '\x011') // eslint-disable-line no-control-regex
    .replace(/\n/g, '\x01n')
    .replace(/\t/g, '\x01t')

  return (client) => {
    console.log('Dovecot: client connected')
    client.on('end', () => console.log('Dovecot: client disconnected'))

    const vars = {}

    carrier.carry(client, null, 'ascii')
      .on('line', async (line) => {
        console.log(`Dovecot: got request line (${line})`)
        const cmd = line[0]

        switch(cmd) {
        case CMD_HELLO: {
          const vals = line.substring(1).split('\t')
          vars.user = vals[3]
          vars.table = vals[4]
        }
          break

        case CMD_LOOKUP:
          switch(vars.table) {
          case 'auth':
            vars.user = line.split('/')[1]
            console.log(`Dovecot: looking up auth for ${vars.user}`)
            try {
              const user = await db.get(vars.user)
              console.log(`Dovecot: Found auth entry in db for ${user._id}`)
              client.write('O')
              client.write(JSON.stringify({ password: user.password }))
              client.write('\n')
            } catch(err) {
              console.log('Dovecot: responding with auth Not Found')
              client.write('N\n')
            }
            break

          case 'sieve': {
            console.log(`Dovecot: looking up sieve for ${vars.user}`)
            const paths = line.split('/')
            switch(paths[2]) {
            case 'name':
              // Dovecot caches the compiled script based on the ID we return
              // so let's return a composite key based on the _id and _rev of the script
              try {
                const user = await db.get(vars.user)
                const sieve = await db.get(user.sieve[paths[3]])

                console.log(`Dovecot: Found sieve entry in db for ${sieve._id}:${sieve._rev}`)

                client.write('O')
                client.write(`${sieve._id}+${sieve._rev}`)
                client.write('\n')
              } catch(err) {
                console.log(`Dovecot: could not find the sieve script document reference for the user ${vars.user}`)
                client.write('N\n')
              }
              break

            case 'data':
              try {
                const data = await db.get(paths[3].split('+')[0])

                console.log(`Dovecot: Found data entry in db for ${data._id}`)

                client.write('O')
                client.write(dovecotEscape(data.script))
                client.write('\n')
              } catch(err) {
                console.log(`Dovecot: could not find script data with id ${paths[3]}`)
                client.write('N\n')
              }
              break

            default:
              console.log(`Dovecot: Unknown sieve operation: ${paths[2]}`)
              client.write('N\n')
              break
            }
          }
            break

          default:
            console.log(`Dovecot: Unknown table: ${vars.table}`)
            client.write('N\n')
            break
          }
          break

        default:
          console.log(`Dovecot: Unknown command, disconnecting: ${cmd}`)
          client.end()
          break
        }
      })
  }
}

net.createServer(domainHandler()).listen(40571, '0.0.0.0', () => console.log('domain handler listening on 40571'))
net.createServer(mailboxHandler()).listen(40572, '0.0.0.0', () => console.log('mailbox handler listening on 40572'))
net.createServer(aliasHandler()).listen(40573, '0.0.0.0', () => console.log('alias handler listening on 40573'))
net.createServer(dovecotAuthHandler()).listen(40574, '0.0.0.0', () => console.log('dovecot auth handler listening on 40574'))
