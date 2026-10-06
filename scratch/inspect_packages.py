import os
import sys
import django

sys.path.insert(0, r"D:\CMS\Language_lab\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from content_studio.models import Experience, PublishedPackage, PublishVersion

print("=== EXPERIENCES ===")
experiences = Experience.objects.all()
print(f"Total Experiences: {experiences.count()}")
for exp in experiences:
    print(f"ID={exp.id}, title='{exp.title}', status='{exp.status}', is_deleted={exp.is_deleted}")

print("\n=== PUBLISHED PACKAGES ===")
packages = PublishedPackage.objects.all()
print(f"Total PublishedPackages: {packages.count()}")
for pkg in packages:
    print(f"ID={pkg.id}, name='{pkg.package_name}', status='{pkg.status}', compression_status='{pkg.compression_status}', exp_id={pkg.experience_id}")

print("\n=== PUBLISH VERSIONS ===")
versions = PublishVersion.objects.all()
print(f"Total PublishVersions: {versions.count()}")
for ver in versions:
    print(f"ID={ver.id}, ver='{ver.version_number}', pkg_id={ver.published_package_id}, file_path='{ver.file_path}', checksum='{ver.checksum}'")
