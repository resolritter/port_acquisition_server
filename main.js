const http = require("http")
const cp = require("child_process")
const fs = require("fs")
const assert = require("assert")

const [lowestPort, highestPort] = fs
  .readFileSync("/proc/sys/net/ipv4/ip_local_port_range")
  .toString()
  .split("\n")[0]
  .split("\t")
  .map(function (port) {
    return parseInt(port)
  })
assert.ok(lowestPort)
assert.ok(highestPort)

const acquiredPorts = new Set()
const acquirePort = function () {
  const takenPorts = new Map(
    cp
      .execFileSync("ss", ["-lntu"], { stdio: ["inherit", "pipe", "inherit"] })
      .toString()
      .split("\n")
      .slice(1)
      .map(function (line) {
        let separatorCount = 0
        let isSpace = false
        for (let i = 0; i < line.length; ++i) {
          if (line[i] === " ") {
            if (!isSpace) {
              isSpace = true
            }
          } else {
            if (isSpace) {
              ++separatorCount
              isSpace = false
            }
          }

          if (separatorCount === 4) {
            let j = i
            for (; j < line.length; ++j) {
              if (line[j] === " ") {
                break
              }
            }

            const part = line.slice(i, j)
            return part.slice(part.lastIndexOf(":") + 1)
          }
        }
      })
      .map(function (v) {
        return [v, undefined]
      }, {}),
  )

  for (let i = lowestPort; i < highestPort; ++i) {
    if (!acquiredPorts.has(i.toString())) {
      acquiredPorts.add(i.toString())
      return i
    }
  }
}

const requestListener = function (req, res) {
  const [, ops, value] = req.url.split("/")

  if (ops === "acquirePort") {
    const port = acquirePort()
    if (port) {
      acquiredPorts.set(port, undefined)
      res.writeHead(201, { "Content-Type": "text/plain" })
      res.end(port.toString())
      return
    } else {
      res.writeHead(500)
    }
  } else if (ops === "freePort") {
    const port = parseInt(value)
    if (isNaN(port)) {
      res.writeHead(422)
    } else if (acquiredPorts.delete(port)) {
      res.writeHead(200)
    } else {
      res.writeHead(404)
    }
  }

  res.end()
}

const die = function (err) {
  console.error(err)
  process.exit(1)
}

try {
  // promise will never resolve, thus the process will be running until
  // killed; node waits for hanging handles running anyways
  new Promise(function () {
    // keep trying until a port is acquired
    while (true) {
      const daemonPort = acquirePort()
      assert.ok(daemonPort)
      try {
        const server = http.createServer(requestListener)
        server.listen(daemonPort)
        console.log(`Listening on http://127.0.0.1:${daemonPort}\n`)
        break
      } catch (err) {
        if (
          !(err instanceof Error) ||
          // this error can be recovered from by trying another port
          !err.message.includes("address already in use")
        ) {
          throw err
        }
      }
    }
  }).catch(die)
} catch (err) {
  die(err)
}
