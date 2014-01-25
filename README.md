# Hellowin Frontend Play

## Getting ready

install phantom-js: http://phantomjs.org/download.html

	brew install phantomjs

install nodeJs (http://nodejs.org/download/) or use package manager

	npm install -g yo grunt-cli bower

make sure they are included in PATH

cd to repo, run

	npm install

to get required node modules

then run

 	bower install

to get frontend dependencies

last but not least

	sudo gem install compass susy animate

to get required css frameworks make sure they are included in PATH

## Start Server

 	grunt server

### e2e Testing

 	grunt test:e2e
