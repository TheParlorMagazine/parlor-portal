# Custom Article Components

Custom article components go here. Filename must match the article slug.

Component receives article data as props.

## Example

For an article with slug `my-special-piece`, create:

```
app/post/_custom/my-special-piece.jsx
```

## Props

```jsx
export default function MySpecialPiece({ article, userId, segments, articleHasAccess }) {
  // article — full article row from Supabase
  // userId — authenticated user ID (null if not logged in)
  // segments — parsed body segments ({ kind, content/attrs })
  // articleHasAccess — boolean, whether the current user has access
  return <div>...</div>
}
```

## Setup

1. Set the article's Template to "Custom React" in the editor
2. Create a `.jsx` file here with the same name as the article slug
3. Export a default React component — it receives the article data as props
4. If the file is missing, the page falls back to the standard template
