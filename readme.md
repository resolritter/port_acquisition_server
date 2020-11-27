# Introduction

A no-NPM-dependencies primitive service for leasing open ports on Unix systems.
After it's running, sending a request to `/acquirePort` will respond with some
available port which shall be "reserved" to the caller in the sense that the server
will keep track of it and respond with a different port each time. The
reservation is only kept in-memory, thus the registry will be lost when the
server stops.

The main use-case I have for it is for reserving ports for parallel service
instances during concurrent integration tests' execution. In practice:

1. Spin up this server before running tests
2. Call it when you're executing an integration test to reserve ports for
  your database, web server, etc... This will guarantee each service will
  bind to a different port, even though they're all running concurrently
3. When the whole suit is done, kill this daemon. All ports are freed, then.

[Coded use-case](https://github.com/resolritter/koa_knex_starter/blob/40b5c8711efc5c0a7763d2216212f2a78983cd94/src/tests/integration/lib/utils.js#L10)

# Running

Purposefully, this server relies only on built-in Node packages. No third-party
package has to be started from NPM. Simply run:

```
npm run start
```

That will start the server in some available port and print its bound address on startup.

**Output**

```
> port_acquisition_server@0.0.1 start /home/reaysawa/js/port_acquisition_server
> node main.js

Listening on http://127.0.0.1:32768
```

# Endpoints

## /acquirePort

```
$ curl -v 127.0.0.1:32768/acquirePort

*   Trying 127.0.0.1:32768...
* Connected to 127.0.0.1 (127.0.0.1) port 32768 (#0)
> GET /acquirePort HTTP/1.1
> Host: 127.0.0.1:32768
> User-Agent: curl/7.73.0
> Accept: */*
> 
* Mark bundle as not supporting multiuse
< HTTP/1.1 201 Created
< Content-Type: text/plain
< Date: Fri, 27 Nov 2020 08:30:26 GMT
< Connection: keep-alive
< Keep-Alive: timeout=5
< Transfer-Encoding: chunked
* Connection #0 to host 127.0.0.1 left intact

32769
```

Where `32769` is the port which has been reserved.

As noted by the output above, a successful response has status code `201` (Created).

## /freePort/:port

```
$ curl -v 127.0.0.1:32768/freePort/32769

*   Trying 127.0.0.1:32768...
* Connected to 127.0.0.1 (127.0.0.1) port 32768 (#0)
> GET /freePort/32769 HTTP/1.1
> Host: 127.0.0.1:32768
> User-Agent: curl/7.73.0
> Accept: */*
> 
* Mark bundle as not supporting multiuse
< HTTP/1.1 200 OK
< Date: Fri, 27 Nov 2020 08:34:33 GMT
< Connection: keep-alive
< Keep-Alive: timeout=5
< Transfer-Encoding: chunked
* Connection #0 to host 127.0.0.1 left intact
```

As noted by the output above, a successful response has status code `200` (OK).
