#!/usr/bin/env python
# -*- coding: utf-8 -*-

import tornado.httpserver
import tornado.ioloop

import handlers
import options
import rpc


class Application(tornado.web.Application):

    """Custom application class for Instant.fm"""

    def __init__(self):
        url_handlers = [
            (r"/", handlers.HomeHandler),
            (r"/json-rpc/?$", rpc.JsonRpcHandler),
            (r"/upload/?$", handlers.UploadHandler),
            (r"/p/([a-zA-Z0-9]+)/?$", handlers.PlaylistHandler),
            (r"/terms/?$", handlers.TermsHandler),
            (r"/search/?$", handlers.SearchHandler),
            (r"/([^/]+)/album/([^/]+)/?", handlers.AlbumHandler),
            (r"/([^/]+)/?", handlers.ArtistHandler),
            (r".*", handlers.ErrorHandler),
        ]
        tornado.web.Application.__init__(self, url_handlers, **options.tornado_settings)


def main():
	# Code to daemonize tornado.
	# Not used in production since supervisord requires non-daemonized processes.
    if options.cli_args.daemonize:
        try:
            import daemon
            log = open('static/tornado.log', 'a+') # Note: Publicly visible tornado.log file!
            context = daemon.DaemonContext(stdout=log, stderr=log, working_directory='.')
            context.open()
        except ImportError:
            print 'python-daemon not installed; not running as daemon'

    http_server = tornado.httpserver.HTTPServer(Application(), xheaders=True)
    http_server.listen(options.cli_args.port)

    # Start the main loop
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    main()
