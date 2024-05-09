# Quizzer API

## API

### `GET /deck/:id`

Get a deck of word pairs

### `POST /deck`

Create a deck

```json
{
  "name": "foo",
  "language": "nl",
  "pairs": [
    ["links", "left"],
    ["recht", "right"]
  ]
}
```

### `POST /fav/links:left`

Store a favorite pair

### `DELETE /fav/links:left`

Delete a favorite pair

### `GET /fav`

Get a deck with all favourites
