instructions for next.js app which I am planning to create that shows

1) home page - which shows list of latest posted song lyrics ( title, small description , thumbnail as clickable link) from api https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/~/?alt=json

2) on clicking each song link it should take to song details page which will take category / tag from song list e.g. Song:Monica%20-%20Coolie and call https://tsonglyricsapp.blogspot.com/feeds/posts/default/-/Song:Monica%20-%20Coolie?alt=json


a proxy might be needed so we need to add a proxy file as I am planning to depoloy in vercel.

Plan

1) is to post new songs in blogger which I will do manually , once posted, going to this new app home page should load latest posted lyrics and on clicking it will take to song details page

2) minimize using google ads , as user visits increase via google search , I want to earn using ad clicks and impressions so I want to make this app highly SEO friendly



3) Make this app very simple and with elegant design such that users visit back more ( high return users)

4) need to provide subscribe option for push notification so that whenever new post is added to blogeer, I will manually trigger new notification and subscribed users will receive quickly and visit the page.

any recommendations on libraries or tools to use for this project are welcome.
make use of Next.js for server-side rendering and API routes, Tailwind CSS for styling, and Vercel for deployment.
should be high-performance and optimized for SEO.
optimize images and assets for faster loading times.
optimized for google ads integration and high user clicks