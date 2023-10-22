import {loadSummarizationChain} from 'langchain/chains'
import {ChatOpenAI} from 'langchain/chat_models/openai'
import {PromptTemplate} from 'langchain/prompts'
import {RecursiveCharacterTextSplitter} from 'langchain/text_splitter'
import {NodeHtmlMarkdown} from 'node-html-markdown'

import {AIbitatPlugin} from '..'

/**
 * Use serper.dev to search on Google.
 *
 * **Requires an SERPER_API_KEY environment variable**.
 *
 * @param query
 * @returns
 */
async function search(
  query: string,
  options: {
    /**
     * `serper.dev` API key.
     * @default process.env.SERPER_API_KEY
     */
    serperApiKey?: string
  } = {},
) {
  console.log('🔥 ~ Searching on Google...')
  const url = 'https://google.serper.dev/search'

  const payload = JSON.stringify({
    q: query,
  })

  const headers = {
    'X-API-KEY': options.serperApiKey || (process.env.SERPER_API_KEY as string),
    'Content-Type': 'application/json',
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: payload,
  })

  return response.text()
}

/**
 * Scrape a website and summarize the content based on objective if the content is too large.
 * Objective is the original objective & task that user give to the agent, url is the url of the website to be scraped.
 * `BROWSERLESS_TOKEN` environment variable is required.
 *
 * @param url
 * @returns
 */
async function scrape(url: string) {
  console.log('🔥 Scraping website...', url)

  const headers = {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json',
  }

  const data = {
    url: url,
  }

  const data_json = JSON.stringify(data)

  const response = await fetch(
    `https://chrome.browserless.io/content?token=${process.env.BROWSERLESS_TOKEN}`,
    {
      method: 'POST',
      headers: headers,
      body: data_json,
    },
  )

  if (response.status !== 200) {
    console.log('🔥 ~ error', data)
    console.log('🔥 ~ error', response)
    return `HTTP request failed with status code "${response.status}: ${response.statusText}"`
  }

  const html = await response.text()
  const text = NodeHtmlMarkdown.translate(html)

  if (text.length <= 8000) {
    return text
  }

  console.log('🔥 Text is too long. Summarizing...', text)
  return summarize(text)
}

/**
 * Summarize content using OpenAI's GPT-3.5 model.
 *
 * @param content The content to summarize.
 * @returns The summarized content.
 */
async function summarize(content: string): Promise<string> {
  const llm = new ChatOpenAI({
    temperature: 0,
    // openAIApiKey
    modelName: 'gpt-3.5-turbo-16k-0613',
  })

  const textSplitter = new RecursiveCharacterTextSplitter({
    separators: ['\n\n', '\n'],
    chunkSize: 10000,
    chunkOverlap: 500,
  })
  const docs = await textSplitter.createDocuments([content])

  const mapPrompt = `
    Write a detailed summary of the following text for a research purpose:
    "{text}"
    SUMMARY:
    `
  const mapPromptTemplate = new PromptTemplate({
    template: mapPrompt,
    inputVariables: ['text'],
  })

  const summaryChain = loadSummarizationChain(llm, {
    type: 'map_reduce',
    combinePrompt: mapPromptTemplate,
    combineMapPrompt: mapPromptTemplate,
    verbose: true,
  })

  const output = await summaryChain.run({inputDocuments: docs})

  return output
}

export function experimental_webBrowsing({}: {} = {}) {
  return {
    name: 'web-browsing-plugin',
    setup(aibitat) {
      //'Scrape a website and summarize the content based on objective if the content is too large.',

      aibitat.function({
        name: 'web-browsing',
        description:
          'Searches for a given query online or navigate to a given url.',
        parameters: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'A search query.',
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'A web URL.',
            },
          },
          oneOf: [{required: ['query']}, {required: ['url']}],
          additionalProperties: false,
        },
        async handler({query, url}) {
          console.log('🔥 ~ Browsing on the internet')
          if (url) {
            return await scrape(url)
          }

          return await search(query)
        },
      })
    },
  } as AIbitatPlugin
}
