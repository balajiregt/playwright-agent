# Third-party notices

The root [MIT license](LICENSE) applies to Balaji's original source in this
repository. It does not relicense third-party dependencies, model weights,
upstream source, trademarks or externally supplied documents. Preserve any
upstream license and copyright notices when redistributing those materials.

The source ZIP contains dependency manifests and lockfiles, not installed
dependencies or model weights. Installing optional components retrieves
separately licensed software. Review the installed packages' original license
files and the complete lockfile dependency graph when distributing a bundled
application. This direct-dependency inventory is not a replacement for those
notices or a complete transitive software bill of materials.

## JavaScript dependencies

Versions and license identifiers below are recorded in the current lockfiles.
The root package and internal `quality/` module have separate lockfiles.

| Component | Locked version | Upstream license |
| --- | --- | --- |
| `@playwright/test` | 1.62.1 | Apache-2.0 |
| `typescript` | 5.9.3 | Apache-2.0 |
| `@types/node` | 22.20.1 root; 22.20.4 quality | MIT |
| `yaml` | 2.9.0 root; 2.9.1 quality | ISC |
| `@modelcontextprotocol/sdk` | 1.32.2 | MIT |
| `zod` | 4.6.7 | MIT |
| `tsx` | 4.23.15 | MIT |

## Optional Python runtimes

`quality/python/requirements-*.txt` identify optional document-parser
dependencies, including OpenPyXL, xlrd and pypdf. These packages retain their upstream
licenses; consult their installed distributions for original notices. This
inventory does not assert that all optional runtime combinations are installed
or verified.

## Source and fixture boundaries

Authored synthetic examples, test fixtures and curated demo captures may be
included with the original project source. Private requirements, raw provider
responses, local credentials, execution reports and unpublished article drafts
are excluded from the source ZIP. External requirements remain owned by their
original authors and are not made public by invoking the packaging command.
