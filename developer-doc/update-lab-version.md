# Update Lab Version

First the new version of Lab should be tagged in the lab framework repository.
You should use a x.y.z-pre.1 tag first, so the new version can be tested before the final version is tagged.

After you have a x.y.z-pre.1 tag in the lab framework repository, then update the staging lab_root_url to this new version so it can be tested.
This is done by changing the `script/setup.rb` file.

After it has been tested then you should tag the Lab framework with the real tag x.y.z
Now update the default and production lab_root_url in the `script/setup.rb`

You should add a tag in this repoistory to indicate the state of the interactives when they were tested with this version of the lab framework. These tags have the form: lab-x.y.z

Older lab releases have been copied to a S3 bucket lab-archives.concord.org and the lab.concord.org cloudfront is setup to forward certain requests for lab.concord.org/X.Y.Z to this bucket. These old releases include the interactives and the framework.
