const http = require("http")
const cp = require("child_process")
const fs = require("fs")
const assert = require("assert")

const port = process.env.PORT
if (!port) {
  console.error("PORT environment variable has not been set")
  process.exit(1)
}

const [lowestPort, highestPort] = fs
  .readFileSync("/proc/sys/net/ipv4/ip_local_port_range")
  .toString()
  .split("\n")[0]
  .split("\t")
  .map(function(port) {
    return parseInt(port)
  })
assert.ok(lowestPort)
assert.ok(highestPort)

const db = new Map()

const acquirePort = function() {
  const takenPorts = new Map(
    cp
      .execFileSync("ss", ["-lntu"], { stdio: ["inherit", "pipe", "inherit"] })
      .toString()
      .split("\n")
      .slice(1)
      .map(function(line) {
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
      .map(function(v) {
        return [v, undefined]
      }, {}),
  )

  for (let i = lowestPort; i < highestPort; ++i) {
    if (!db.has(i.toString())) {
      db.set(i.toString(), undefined)
      return i
    }
  }
}

const requestListener = function(req, res) {
  const [, ops, value] = req.url.split("/")

  if (ops === "acquirePort") {
    const port = acquirePort()
    if (port) {
      db.set(port, undefined)
      res.writeHead(200, { "Content-Type": "text/plain" })
      res.end(port.toString())
      return
    } else {
      res.writeHead(500)
    }
  } else if (ops === "freePort") {
    const port = parseInt(value)
    if (isNaN(port)) {
      res.writeHead(422)
    } else if (db.delete(port)) {
      res.writeHead(200)
    } else {
      res.writeHead(404)
    }
  }

  res.end()
}

const server = http.createServer(requestListener)
server.listen(port)
