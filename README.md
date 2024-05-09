# Quizzer API

### `POST /deck`

Create deck

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

### `POST /fav/links,left`

Store a favorite pair

### `DELETE /fav/links,left`

Delete a favorite pair

### `GET /fav`

Get a deck with all favourites
