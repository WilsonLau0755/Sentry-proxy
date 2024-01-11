import { serve } from "https://deno.land/std/http/server.ts"
import { toArrayBuffer } from "https://deno.land/std/streams/mod.ts";

const SENTRY_HOST = Deno.env.get('SENTRY_HOST')

async function handler(req: Request): Promise<Response> {
  if (!req.body) {
    return
  }
  let bodyString = ''
  const bodyReader = req.body.getReader()
  return bodyReader.read().then(function processText({done, value}) {
    if (done) {
      console.log('stream complete')
      return bodyString
    }
    console.log('stream ing')
    const decoder = new TextDecoder('utf-8');
    const decodedString = decoder.decode(value);
    bodyString = bodyString + decodedString
    return bodyReader.read().then(processText)
  }).then(decodeStr => {
    console.log('get decode body done')
    const piece = decodeStr.split('\n')[0]
    const content_type = decodeStr.split('\n')[1]
    const header = JSON.parse(piece)
    // const dsn = URI.parse(header['dsn'])
    const dsn = new URL(header['dsn'])
    const project_id = dsn.pathname.replace('/', '')

    if (dsn.hostname !== SENTRY_HOST) {
      throw new Error(`Invalid sentry hostname: ${dsn.hostname}`)
    }
    return fetch(`https://${SENTRY_HOST}/api/${project_id}/envelope/`, {
      method: req.method,
      body: decodeStr
    })
  }).catch(e => {
    console.log('error tunneling to sentry')
    console.log(e)
    return e
  })
}

serve(handler);