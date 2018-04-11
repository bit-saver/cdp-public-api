# cdp-public-api

<!-- START doctoc generated TOC please keep comment here to allow auto update -->

<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

* [Getting Started](#getting-started)
  * [Configuration](#configuration)
  * [Using Docker](#using-docker)
  * [Scripts](#scripts)
* [Routes](#routes)
  * [`/v1/language`](#v1language)
    * [Request](#request)
  * [`/v1/taxonomy`](#v1taxonomy)
    * [Request](#request-1)
  * [`/v1/owner/bulk`](#v1ownerbulk)
    * [Request](#request-2)
  * [`/v1/search`](#v1search)
    * [Request](#request-3)
    * [Response](#response)
    * [API Properties](#api-properties)
  * [`/v1/get`](#v1get)
    * [Request](#request-4)
    * [Response](#response-1)
    * [API Properties](#api-properties-1)
  * [`/v1/getsource`](#v1getsource)
    * [Request](#request-5)
    * [Response](#response-2)
    * [API Properties](#api-properties-2)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Getting Started

* `npm install`

### Configuration

Add a `.env` file to the root of your project and set the following environment variables:

```js
NODE_ENV=development
PORT=8080
AWS_HOST=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

**Important**: If you are connecting to AWS Elasticsearch, set the environment field to `production`. By default, the environment is set to `development`.

Follows the [airbnb javascript style guide](https://github.com/airbnb/javascript).

### Using Docker

The Dockerfiles bring up a multi container network housing a Node server for the API and an Elastic server housing the ELK stack. To get started:

* Install Docker if it is not already installed. [Docker for Mac](https://www.docker.com/docker-mac) is the fastest and most reliable way to run Docker on a Mac
* Ensure that you have alloted at least 4.0 GB RAM to Docker as Elasticsearch requires that amount to run. This can be set by going to the 'Preferences' menu of the Docker dropdown and selecting the 'Advanced' tab
* Follow the confguration instructions above but set the `AWS_HOST` as follows `AWS_HOST=elk:9200`
* Run `docker-compose up`

### Scripts

* `npm run start`: Starts the web server normally
* `npm run clear:build`: Removes the build directory.
* `npm run build`: Generates build folder/files.
* `npm run dev`: Re-starts the server and re-complies the `build` folder after every change.
* `npm run test`: Runs npm run test:unit.
* `npm run test:unit`: Executes test cases.

## Routes

### `/v1/language/bulk`

Bulk import languages from a CSV file.

#### Request

Must include a CSV file in the POST keyed by `csv`.
CSV must contain a header with at least `Language Code`, `Display Name`, and `Native Name`. It may also include: `Locale` and `Text Direction` (ltr or rtl).

```http
POST /v1/language/bulk HTTP/1.1
Host: localhost:8080
Content-Type: application/json
{
  "csv": BinaryFile
}
```

### `/v1/taxonomy/bulk`

Bulk import of taxonomy terms.

#### Request

Must include a CSV file in the POST keyed by `csv`.
CSV must contain a header with at least `Parent` and `Child` columns. May also contain `Synonyms` which is a `|` delineated list of synonym mapping keywords. A `Skip` column may also be used to forcefully ignore the entire row.
Terms will be created in sequential order where children are associated with the last seen parent row above it.

```http
POST /v1/taxonomy/bulk HTTP/1.1
Host: localhost:8080
Content-Type: application/json
{
  "csv": BinaryFile
}
```

### `/v1/owner/bulk`

Bulk import of owners.

#### Request

Must include a CSV file in the POST keyed by `csv`.
The CSV is simply a list of owner names.

```http
POST /v1/owner/bulk HTTP/1.1
Host: localhost:8080
Content-Type: application/json
{
  "csv": BinaryFile
}
```

### `/v1/search`

Search request to CDP [`AWS`|`localhost`].

#### Request

```http
POST /v1/search HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{
  "body": "",
  "defaultField": "",
  "exclude": "",
  "from": "",
  "include": ["published", "title", "excerpt", "link"],
  "index": "",
  "query": "language.locale:en-US",
  "size": "5",
  "sort": "",
  "type": "posts"
}
```

#### Response

```json
{
  "took": 2,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "hits": {
    "total": 16016,
    "max_score": 1,
    "hits": [{}, {}, {}]
  }
}
```

#### API Properties

| Params  | Description                                                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| body    | `JSON string, Object{}` - An optional request body, as either JSON or a JSON serializable object.                                       |
| exlcude | `String, String[]` -  A list of fields to exclude from the returned \_source field                                                      |
| from    | `number` — Starting offset (default: 0)                                                                                                 |
| include | `String, String[]` - A list of fields to extract and return from the \_source field                                                     |
| index   | `String, String[]` - A comma-separated list of index names to search; use \_all or empty string to perform the operation on all indices |
| query   | `String, String[]` - A comma-separated list of specific routing values                                                                  |
| size    | `Number` - Number of hits to return (default: 10)                                                                                       |
| sort    | `String, String[]` - A comma-separated list of : pairs                                                                                  |
| type    | `String, String[]` - A comma-separated list of document types to search; leave empty to perform the operation on all types              |

### `/v1/get`

Get a JSON document from the index based on its id (document id, not post id).

#### Request

```http
POST /v1/get HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Cache-Control: no-cache

{
  "include": "",
  "exclude": "",
  "index": "share.america.gov",
  "id": "AVvaUp3b7IRpFeXBlfMX",
  "type": "post"
}
```

#### Response

```json
{
  "_index": "share.america.gov",
  "_type": "post",
  "_id": "AVvaUp3b7IRpFeXBlfMX",
  "_version": 1,
  "found": true,
  "_source": {}
}
```

#### API Properties

| Params  | Description                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| exlcude | `String, String[]` -  A list of fields to exclude from the returned \_source field                            |
| include | `String, String[]` -  A list of fields to extract and return from the \_source field                          |
| index   | `String` - The name of the index                                                                              |
| type    | `String` -  The type of the document (use \_all to fetch the first document matching the ID across all types) |
| id      | `String` -  The document ID                                                                                   |

### `/v1/getsource`

Get the source of a document by its index, type and id.

#### Request

```http
POST /v1/getSource HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Cache-Control: no-cache

{
  "index": "share.edit.staging.america.gov",
  "type": "post",
  "id": "AVvaRlI57IRpFeXBle3J"
}
```

#### Response

```json
{
  // object only contains source fields
}
```

#### API Properties

| Params  | Description                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| exlcude | `String, String[]` -  A list of fields to exclude from the returned \_source field                            |
| id      | `String` -  The document ID                                                                                   |
| include | `String, String[]` -  A list of fields to extract and return from the \_source field                          |
| index   | `String` - The name of the index                                                                              |
| type    | `String` -  The type of the document (use \_all to fetch the first document matching the ID across all types) |
