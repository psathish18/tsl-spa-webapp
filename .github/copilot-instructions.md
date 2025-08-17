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

## migration
## Summary 
migration of current tsonglyrics.com urls hosted in wordpress bluehost to new app once tsonglyrics.com is mapped to vercel domain.
currently I have my website hosted in bluehost with wordpress hosting where I post lyrics manually, 
## Manual steps that I follow 
Here are the steps I follow 
1)  I post lyrics first in tsonglryicsapp.blogspot.com 
2)  then post same lyrics in tsonglyrics.com wordpress website hosted in bluehost
3)  I copy the lyrics, categories and tag from blogger post but title and url might not match 
4) now if I map my existing domain tsonglyrics.com to this new app, I need to make sure that the existing links are redirected to the new app's song details page without affecting SEO and "not found" 
5) since content is same I dont need to migrate post content, meaning same number of posts are present in blogger and wordpress I only need to make sure once I map domain to this new app, all urls are working correctly
6) one thing we can do is to update title of all posts in blogger to match the title in wordpress, so that when user clicks on the link from google search, it will take them to the correct song details page in the new app

You task is to give me a migration plan and different options if any to accomplish above requirement.


# aug 17, 2025
# new feature
HERE IS MY NEW REQUIREMENT - SNIPPET SHARING feature - lyrics content is basically divided into group of 4 or 5 lines - we can identify using two <br/></br/>, splitting lyrics based on two break tags and create twitter and whatsapp(if mobile) deeplink for the user to share easily and quickly, in my original site I use this
<div class="share-this-new-snippet">Nilava sivappaakkum Thanjavoor Kaari <br>Manasa rendaakki vaaravaa killa <br>Erumbaa karumbaakkum pappaali lorry <br>Bhashaa kaipaththak konam illa <br><div><a class="fa fa-twitter" href="https://twitter.com/intent/tweet?via=tsongslyrics&amp;url=https%3A%2F%2Fwww.tsonglyrics.com%2Fmonica-coolie-lyrics.html&amp;text=%F0%9F%8C%9FNilava%20sivappaakkum%20Thanjavoor%20Kaari%0AManasa%20rendaakki%20vaaravaa%20killa%0AErumbaa%20karumbaakkum%20pappaali%20lorry%0ABhashaa%20kaipaththak%20konam%20illa%0A%F0%9F%8C%9F%0A%0A%23AnirudhRavichander%20%23Coolie%20%23Monica%20%23Sublahshini%0A%0Afull%20lyrics%20%F0%9F%91%89" rel="nofollow noreferrer" target="_blank"> tweet!</a></div></div>

- retain line breaks in link sharing so that users can read it 
- right light sharing links 
- add star emoji to the beginning and end of each snippet, then add hasgtag of all category tags after ":"

e.g 
⭐kalangathe kanne enbayae
en uyirin aadhi
indreno maunam kondaye
en peyarin paadhi
ini unnai paarkka mudiyaadha
un maarbil saaya mudiyaadha⭐ 

#Heisenberg #Coolie2024 #Anirudh #SaiSmriti 
http://localhost:3000/uyirnaadi-nanbane-lyrics-tamil.html via @tsongslyrics 