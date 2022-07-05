# Contributing to FeatherFrame

Before jumping into a PR be sure to search [existing PRs](https://github.com/FishingHacks/featherframe/pulls) or [issues](https://github.com/FishingHacks/featherframe/issues) for an open or closed item that relates to your PR

# Developing
To Develop Locally:

1. [Fork](https://help.github.com/articles/fork-a-repo/) this Repo and then [clone](https://help.github.com/articles/cloning-a-repository/) yours to your Computer

2. Install all Dependencies:
   ```
   npm i
   ```
3. make npx use your featherframe:
   ```
   npm i -g .
   ```
   *Note: you might need root to do it on unix-like operating Systems. This step must not be repeated after changes to the code*
4. Edit Files, Add an Example showcasing your changes, and run the examples with:
   ```
   featherframe . --debug
   ```
5. Show off the development progress using commits:
   ```
   git add .
   git commit
   ```

6. Sync the changes to Github:
   ```
   git push
   ```
7. Create a [PR](https://github.com/FishingHacks/featherframe/pulls) and explain your changes. We will review it and hopefully merge it. 

   It should Contain Markup, describing how to use your changes, if neccessary. (For the Wiki)
9. When your changes are merged, you can delete your copy of featherframe
